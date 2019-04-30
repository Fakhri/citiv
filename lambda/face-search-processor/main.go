package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/rekognition"
	"github.com/aws/aws-sdk-go/service/sns"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"
)

type Configuration struct {
	Region                 string
	TargetSnsTopicArn      string
	FbMessengerAccessToken string
	StitchWebHookUrl       string
}

type SnsMessage struct {
	JobId string `json:"JobId"`
}

type FbSendMessageReq struct {
	MessagingType string    `json:"messaging_type"`
	Recipient     Recipient `json:"recipient"`
	Message       Message   `json:"message"`
}

type Recipient struct {
	Id string `json:"id"`
}

type Message struct {
	Text string `json:"text"`
}

type Recognition struct {
	Criminals []string `json:"criminals"`
	JobId     string   `json:"job_id"`
	CctvId    string   `json:"cctv_id"`
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	Timestamp int64    `json:"timestamp"`
	Country   string   `json:"country"`
	City      string   `json:"city"`
}

func main() {
	lambda.Start(FaceSearchProcessor)
}

func FaceSearchProcessor(ctx context.Context, event events.SNSEvent) (string, error) {
	log.Printf("start FaceSearchProcessor, event: %v", event)

	jsonMessage := event.Records[0].SNS.Message
	log.Printf("SNS message: %v", jsonMessage)

	snsMessage := SnsMessage{}
	json.Unmarshal([]byte(jsonMessage), &snsMessage)

	jobId := snsMessage.JobId
	log.Printf("Rekognition jobId: %s", jobId)

	config := Configuration{
		Region:                 os.Getenv("REGION"),
		TargetSnsTopicArn:      os.Getenv("TARGET_SNS_TOPIC_ARN"),
		FbMessengerAccessToken: os.Getenv("FB_MESSENGER_ACCESS_TOKEN"),
		StitchWebHookUrl:       os.Getenv("STITCH_WEB_HOOK_URL"),
	}

	log.Printf("start GetFaceSearch")
	result, err := getFaceSearchResult(config, jobId)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("GetFaceSearch result acquired, status: %s", *result.JobStatus)

	criminalFacesMap := make(map[string]float64)

	for _, person := range result.Persons {
		if len(person.FaceMatches) != 0 {
			for _, faceMatch := range person.FaceMatches {
				val := criminalFacesMap[*faceMatch.Face.ExternalImageId]
				criminalFacesMap[*faceMatch.Face.ExternalImageId] = math.Max(*faceMatch.Similarity, val)
			}
		}
	}

	var strBuilder strings.Builder
	strBuilder.WriteString(fmt.Sprintf("Analysis result for video with job id: %s\n", jobId))

	var criminals []string

	if len(criminalFacesMap) == 0 {
		strBuilder.WriteString("There is no criminal suspect in this video")
	} else {
		strBuilder.WriteString("Detected criminal suspects:\n")
		for key, val := range criminalFacesMap {
			strBuilder.WriteString(fmt.Sprintf("name: %s - similarity: %f\n", key, val))
			criminals = append(criminals, key)
		}
	}

	message := strBuilder.String()
	log.Println(message)
	publishToStitch(config, criminals, jobId)
	publishToSns(config, message)

	var psIds []string
	psIds = append(psIds, "2171991696252840")
	psIds = append(psIds, "2235838546508930")
	psIds = append(psIds, "1787173938050269")

	for _, psId := range psIds {
		sendToFb(config, message, psId)
	}

	return "success", nil
}

func getFaceSearchResult(config Configuration, jobId string) (*rekognition.GetFaceSearchOutput, error) {
	session, err := session.NewSession(&aws.Config{Region: aws.String(config.Region)})
	if err != nil {
		return nil, err
	}

	rek := rekognition.New(session)

	input := rekognition.GetFaceSearchInput{JobId: &jobId}

	result, err := rek.GetFaceSearch(&input)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func publishToStitch(config Configuration, criminals []string, jobId string) {
	log.Print("start publishToStitch")

	var stitchWebHook string
	if config.StitchWebHookUrl != "" {
		stitchWebHook = config.StitchWebHookUrl
	} else {
		stitchWebHook = "https://webhooks.mongodb-stitch.com/api/client/v2.0/app/citiv-zzbsj/service/saveRecognisedCriminals/incoming_webhook/saveRecognisedCriminals"
	}

	req := Recognition{
		Criminals: criminals,
		JobId:     jobId,
		CctvId:    "monas",
		Latitude:  -6.1753871,
		Longitude: 106.8249641,
		Timestamp: time.Now().Unix(),
		Country:   "indonesia",
		City:      "jakarta",
	}
	payload, err := json.Marshal(req)

	res, err := http.Post(stitchWebHook, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Fatal(err)
	}

	defer res.Body.Close()

	responseBytes, err := ioutil.ReadAll(res.Body)
	log.Printf("received publishToStitch response: %s, status code: %d", string(responseBytes), res.StatusCode)

	log.Print("finished publishToStitch")
}

func publishToSns(config Configuration, message string) error {
	log.Print("start publish message to SNS")

	session, err := session.NewSession(&aws.Config{Region: aws.String(config.Region)})
	if err != nil {
		return err
	}

	input := sns.PublishInput{Message: &message, TopicArn: &config.TargetSnsTopicArn}

	snsClient := sns.New(session)
	snsClient.Publish(&input)

	log.Print("finished publish message to SNS")

	return nil
}

func sendToFb(config Configuration, message string, psId string) {
	log.Println(message)

	req := FbSendMessageReq{
		Message:       Message{Text: message},
		MessagingType: "RESPONSE",
		Recipient:     Recipient{Id: psId},
	}

	url := fmt.Sprintf("https://graph.facebook.com/v3.2/me/messages?access_token=%s", config.FbMessengerAccessToken)

	payload, err := json.Marshal(req)
	res, err := http.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Fatal(err)
	}

	defer res.Body.Close()

	responseBytes, err := ioutil.ReadAll(res.Body)
	log.Printf("received response: %s, status code: %d", string(responseBytes), res.StatusCode)
}
