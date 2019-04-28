exports = function(payload) {
    const jsonBody = EJSON.parse(payload.body.text())

    const mongodb = context.services.get("citiv")
    const collection = mongodb.db("citiv").collection("crime-detection")

    for (idx in jsonBody.labels) {
        newItem = {
            "owner_id": 1,
            "label": jsonBody.labels[idx],
            "job_id": jsonBody.job_id,
            "cctv_id": jsonBody.cctv_id,
            "latitude": jsonBody.latitude,
            "longitude": jsonBody.longitude,
            "timestamp": jsonBody.timestamp,
            "country": jsonBody.country,
            "city": jsonBody.city
        }

        collection.insertOne(newItem)
            .then(result => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
            .catch(err => console.error(`Failed to insert item: ${err}`))
    }

    return  jsonBody
}
