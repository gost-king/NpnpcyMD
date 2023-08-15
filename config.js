import { periodic } from "./lib/Time.js"
import path from "path"
import fs from "fs"

export let config = JSON.parse(fs.readFileSync("./config.json"))
export let reacts = JSON.parse(fs.readFileSync("./reacts.json"))

export let db = JSON.parse(fs.readFileSync(config.path.database), null, 4)
if(db) db = {
	runtime: 0,
	commands: {},
	...(db)
}
db.runtime = Date.now()

periodic("10s", () => {
	fs.writeFileSync(config.path.database, JSON.stringify(db, null, 4))
	fs.writeFileSync("./config.json", JSON.stringify(config, null, 4))
	fs.writeFileSync("./reacts.json", JSON.stringify(reacts, null, 4))
})