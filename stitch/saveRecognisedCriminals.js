exports = function(payload) {
    const jsonBody = EJSON.parse(payload.body.text())

    const mongodb = context.services.get("citiv")
    const collection = mongodb.db("citiv").collection("recognition")

    for (idx in jsonBody.criminals) {
        newRecognition = {
            "owner_id": 1,
            "criminal": jsonBody.criminals[idx],
            "job_id": jsonBody.job_id,
            "cctv_id": jsonBody.cctv_id,
            "latitude": jsonBody.latitude,
            "longitude": jsonBody.longitude,
            "timestamp": jsonBody.timestamp,
            "country": jsonBody.country,
            "city": jsonBody.city
        }

        collection.insertOne(newRecognition)
            .then(result => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
            .catch(err => console.error(`Failed to insert item: ${err}`))
    }

    return  jsonBody
}
