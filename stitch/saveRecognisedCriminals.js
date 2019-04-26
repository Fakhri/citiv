exports = function(payload) {
    const jsonBody = EJSON.parse(payload.body.text())

    const mongodb = context.services.get("citiv")
    const collection = mongodb.db("citiv").collection("recognition")

    newRecognition = {
        "owner_id": 1,
        "name": jsonBody.name,
        "video": jsonBody.video,
    }

    collection.insertOne(newRecognition)
        .then(result => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
        .catch(err => console.error(`Failed to insert item: ${err}`))

    return  jsonBody
}
