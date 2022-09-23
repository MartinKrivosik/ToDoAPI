const Joi = require('joi')
const con = require("./config")
const { response } = require('express')
const express = require('express')
const { DEC8_BIN } = require('mysql/lib/protocol/constants/charsets')
const app = express()
const bcrypt = require("bcrypt")
let loggedInUserName;
let loggedInUserId;

// for parsing json data
app.use(express.json())

// get all users
app.get('/allUsers', (req, res) =>{

    con.query("select name from users", (err, result)=>{
        if(err){
            res.send("error")
        } else{
            res.send(result)
        }
    })
});

// post for registering new user
// input: username, password
app.post("/createUser", async (req, res) =>{
     
    // requirements for name and password
    const schema = Joi.object({
        name: Joi.string().min(1).required(),
        password: Joi.string().min(1).required()
    });

    const {error} = schema.validate({name: req.body.name, password: req.body.password})

    if (error) return res.status(400).send(error.details[0].message)

    const user = req.body.name
    // encrypt password
    const hashedPassword = await bcrypt.hash(req.body.password,10)

    const sqlSearch = "select * from users where name = ?"
    const searchQuery = con.format(sqlSearch, [user])

    const sqlInsert = "insert into users  values (0, ?, ?)"
    const insertQuery = con.format(sqlInsert, [user, hashedPassword])

        // check if user already exists
        con.query (searchQuery, (err, result) =>{
            if (err) throw err
    
            if (result.length != 0){
                res.status(409).send("User already has an account")
            }
            else{
                con.query(insertQuery, (err, result) =>{
                    if (err) throw err;

                    res.status(201).send("User successfully created")
                })
            }
    })
})

// post for logging in
// input: username, corresponding password
app.post("/login", (req, res) =>{

    const user = req.body.name
    const password = req.body.password

    loggedInUserName = req.body.name

    const sqlSearch = "select * from users where name = ?"
    const searchQuery = con.format(sqlSearch, [user])

    // check if user exists
    con.query(searchQuery, async (err, result) =>{
        if (err) throw err

        if (result.length == 0){
            res.status(404).send("User does not exist")
        }
        else{
            const hashedPassword = result[0].password
            
            // check if password is correct
            if (await bcrypt.compare(password, hashedPassword)){

                const loggedInUserNameID = "select id from users where name = ?"
                const searchQuery = con.format(loggedInUserNameID, [user])

                // save id of currently logged in user
                con.query(searchQuery, (err, result) =>{
                    if (err) throw err

                    loggedInUserId = JSON.parse(JSON.stringify(result))
                    loggedInUserId = loggedInUserId[0].id
                })
                
                res.send(`${user} is logged in`)
            }
            else{
                res.status(401).send("Password Incorrect")
            }
        }
    })

})

// post for creating list
// input: name of list
app.post("/createList", (req, res) =>{
    if(loggedInUserId == null){
        res.status(401).send("User has to be logged in to create a list")
    }

    else{

        // requirements for name and password
        const schema = Joi.object({
            name: Joi.string().min(1).required(),
        });

        const {error} = schema.validate({name: req.body.name})

        if (error) return res.status(400).send(error.details[0].message)

        const name = req.body.name

        // logged in user id
        const loggedInUserNameID = "select id from users where name= ?"
        const searchQuery = con.format(loggedInUserNameID, [loggedInUserName])

        con.query(searchQuery, (err, result) =>{
            if(err) throw err

            const sqlInsert = "insert into lists values (0, ?)"
            const insertQuery = con.format(sqlInsert, [name])

            // add list into lists table
            con.query(insertQuery, (err, result) =>{
                if (err) throw err
            
                // listName => listId
                const listSqlSearch = "Select id from lists where name = ?"
                const listSearchQuery = con.format(listSqlSearch, [name])

                // get list id
                con.query(listSearchQuery, (err, result) =>{
                    if (err) throw err

                    const listId = JSON.parse(JSON.stringify(result))

                    const sqlInsert = "insert into list_users values (?, ?)"
                    const insertQuery = con.format(sqlInsert, [listId[0].id, loggedInUserId])

                    // add listId and userId into list_users table
                    con.query(insertQuery, (err, result) =>{
                        if (err) throw err

                        res.status(201).send(`Created list and connected it to user ${loggedInUserName}`)
                    })
                })
            })
        })
    }
})

// post create activity
// input: activity name, description and deadline
app.post("/createActivity", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    else{

        // requirements for name and password
        const schema = Joi.object({
            name: Joi.string().min(1).required(),
            description: Joi.string().min(1).required(),
            deadline: Joi.date().min('now').required()
        });

        const {error} = schema.validate({name: req.body.name, description: req.body.description, deadline: req.body.deadline})

        if (error) return res.status(400).send(error.details[0].message)


        // inputs
        const name = req.body.name;
        const description = req.body.description;
        const deadline = req.body.deadline;

        // check if activity already exists
        const sqlSearch = "select * from activities where name = ?"
        const searchQuery = con.format(sqlSearch, [name])

        con.query(searchQuery, (err, result) =>{
            if (result == null){
                return res.status(409).send("activity with chosen name already exists")
            }
            else{
                const sqlInsert = "insert into activities values (0, ?, ?, ?)"
                const insertQuery = con.format(sqlInsert, [name, description, deadline])

                // create activity
                con.query(insertQuery, (err, result) =>{
                    if (err) throw err

                    res.status(201).send("Created activity")
                })
            }
        })
    }
})

// put add activity to list
// input: list name, activity name
app.put("/addActivityToList", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    // check input
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
        activityName: Joi.string().min(1).required()
    });

    const {error} = schema.validate({listName: req.body.listName, activityName: req.body.listName})

    if (error) return res.status(400).send(error.details[0].message)


    const listName = req.body.listName;
    const activityName = req.body.activityName;

    const listSqlSearch = "select id from lists where name = ?"
    const listSearchQuery = con.format(listSqlSearch, [listName])

    con.query(listSearchQuery, (err, result) =>{
        if (err) throw err
        if (result[0] == null){
            return res.status(404).send("List doesnt exist")
        }

        const listId = JSON.parse(JSON.stringify(result))

        // check if logged in user owns the list 
        const checkUser = "select user_id from list_users where list_id = ?"
        const checkUserQuery = con.format(checkUser, [listId[0].id])

        con.query(checkUserQuery, (err, result) =>{
            if (err) throw err

            const userId = JSON.parse(JSON.stringify(result))
            
            if(userId[0].user_id != loggedInUserId){
                res.send("Logged in user cannot add activities to this list")
            }
            else{
                const activitySqlSearch = "select id from activities where name = ?"
                const activitySearchQuery = con.format(activitySqlSearch, [activityName])

                con.query(activitySearchQuery, (err, result) =>{
                    if (err) throw err
                    if (result[0] == null){
                        return res.status(404).send("Activity doesnt exist")
                    }

                    const activityId = JSON.parse(JSON.stringify(result))

                    const sqlInsert = "insert into list_activities values ( ?, ?, 0)"
                    const insertQuery = con.format(sqlInsert, [listId[0].id, activityId[0].id])

                    con.query(insertQuery, (err, result) =>{
                        if (err) throw err

                        res.send("Added activity to list")
                    })
                })
            }

        })

    })
})

// get all activities from a list
// input: list name 
app.get("/getActivitiesFromList", (req, res) =>{

    // check input
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
    });

    const {error} = schema.validate({listName: req.body.listName})

    if (error) return res.status(400).send(error.details[0].message)


    const listName = req.body.listName;

    // get list id
    const sqlSearch = "select id from lists where name = ?"
    const searchQuery = con.format(sqlSearch, [listName])

    con.query(searchQuery, (err, result) =>{
        if (err) throw err

        const id = JSON.parse(JSON.stringify(result))

        const sqlSearch = "select a.name, a.description, a.deadline, la.flag, DATE_FORMAT(a.deadline, '%d/%m/%y') as deadline from activities a inner join list_activities la on (a.id = la.activities_id) where id in (select activities_id from list_activities where list_id = ?)"
        const searchQuery = con.format(sqlSearch, [id[0].id])

        con.query(searchQuery, (err, result) =>{
            if (err) throw err

            res.send(result)
        })
    })
})

// change flag of activity in list
// input: list name, activity name, flag
app.put("/changeActivityFlag", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    // check input 
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
        activityName: Joi.string().min(1).required(),
        flag: Joi.string().min(1).required()
    });

    const {error} = schema.validate({listName: req.body.listName, activityName: req.body.listName, flag: req.body.flag})

    if (error) return res.status(400).send(error.details[0].message)

    const listName = req.body.listName;
    const activityName = req.body.activityName;
    const flag = req.body.flag;

    // listName => listId
    const listSqlSearch = "Select id from lists where name = ?"
    const listSearchQuery = con.format(listSqlSearch, [listName])

    con.query(listSearchQuery, (err, result) =>{
        if (err) throw err
        if (result[0] == null){
            return res.status(404).send("List doesnt exist")
        }

        const listId = JSON.parse(JSON.stringify(result))

        // check if logged in user owns the list
        const checkUser = "select user_id from list_users where list_id = ?"
        const checkUserQuery = con.format(checkUser, [listId[0].id])

        con.query(checkUserQuery, (err, result) =>{
            if (err) throw err

            const userId = JSON.parse(JSON.stringify(result))
            if(userId[0].user_id != loggedInUserId){
                res.send("Logged in user cannot change activity flag")
            }
            else{
                const activitySqlSearch = "select id from activities where name = ?"
                const activitySearchQuery = con.format(activitySqlSearch, [activityName])

                con.query(activitySearchQuery, (err, result) =>{
                    if (result[0] == null){
                        return res.status(404).send("Activity doesnt exist")
                    }

                    const activityId = JSON.parse(JSON.stringify(result))


                    console.log(flag)
                    const flagSqlUpdate = "update list_activities set flag = ? where list_id = ? && activities_id = ?"
                    const flagUpdateQuery = con.format(flagSqlUpdate, [flag, listId[0].id,activityId[0].id])

                    con.query(flagUpdateQuery, (err, result) =>{
                        if(err) throw err

                        res.send("Flag updated")
                    })
                })
            }

        })

    })


})

// remove activity from list
// input: list name, activity name
app.delete("/removeActivity", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    // check input 
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
        activityName: Joi.string().min(1).required(),
    });

    const {error} = schema.validate({listName: req.body.listName, activityName: req.body.listName})

    if (error) return res.status(400).send(error.details[0].message)

    const listName = req.body.listName
    const activityName = req.body.activityName

    // listName => listId
    const listSqlSearch = "Select id from lists where name = ?"
    const listSearchQuery = con.format(listSqlSearch, [listName])

    con.query(listSearchQuery, (err, result) =>{
        if (err) throw err
        if (result[0] == null){
            return res.status(404).send("List doesnt exist")
        }

        const listId = JSON.parse(JSON.stringify(result))

        // check if logged in user owns the list
        const checkUser = "select user_id from list_users where list_id = ?"
        const checkUserQuery = con.format(checkUser, [listId[0].id])

        con.query(checkUserQuery, (err, result) =>{
            if (err) throw err

            const userId = JSON.parse(JSON.stringify(result))
            if(userId[0].user_id != loggedInUserId){
                res.send("Logged in user cannot add activities to this list")
            }
            else{
                const activitySqlSearch = "Select id from activities where name = ?"
                const activitySearchQuery = con.format(activitySqlSearch, [activityName])

                con.query(activitySearchQuery, (err, result) =>{
                    if (err) throw err
                    if (result[0] == null){
                        return res.status(404).send("Activity doesnt exist")
                    }

                    const activityId = JSON.parse(JSON.stringify(result))

                    const sqlDelete = "delete from list_activities where list_id = ? && activities_id = ?"
                    const deleteQuery = con.format(sqlDelete, [listId[0].id, activityId[0].id])

                    con.query(deleteQuery, (err, result) =>{
                        if (err) throw err

                        res.send("Deleted activity from list")
                    })
                })
            }

        })

    })
})

//delete list
// input: list name
app.delete("/deleteList", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    // check input 
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
    });

    const {error} = schema.validate({listName: req.body.listName})

    if (error) return res.status(400).send(error.details[0].message)
    const listName = req.body.listName

    // listName => listId
    const listSqlSearch = "Select id from lists where name = ?"
    const listSearchQuery = con.format(listSqlSearch, [listName])

    con.query(listSearchQuery, (err, result) =>{
        if (result[0] == null) res.status(404).send("List doesnt exist")
        else{
            const listId = JSON.parse(JSON.stringify(result))

            // check if logged in user owns the list
            const checkUser = "select user_id from list_users where list_id = ?"
            const checkUserQuery = con.format(checkUser, [listId[0].id])

            con.query(checkUserQuery, (err, result) =>{
                if (err) throw err

                const userId = JSON.parse(JSON.stringify(result))

                for (let i = 0; i < userId.length; i++){
                    if (userId[i].user_id == loggedInUserId){
                        const listSqlDelete = "delete from lists where id = ?"
                        const listDeleteQuery = con.format(listSqlDelete, [listId[0].id])

                        con.query(listDeleteQuery, (err, result) =>{
                            if (err) throw err

                            const listSqlDelete = "delete from list_users where list_id = ?"
                            const listDeleteQuery = con.format(listSqlDelete, [listId[0].id])

                            con.query(listDeleteQuery, (err, result) =>{
                                res.send("List deleted")
                            })
                        })
                    }
                }   
            res.send("Logged in user cannot add activities to this list")
            })
        }
    })
})

// post give other user access to editing your list
// input: list name, user to give access to
app.post("/shareList", (req, res) =>{
    if(loggedInUserId == null){
        return res.status(401).send("User had to be logged in to add activity to list")
    }

    // check input 
    const schema = Joi.object({
        listName: Joi.string().min(1).required(),
        user: Joi.string().min(1).required(),
    });

    const {error} = schema.validate({listName: req.body.listName, user: req.body.user})

    if (error) return res.status(400).send(error.details[0].message)

    const listName = req.body.listName;
    const user = req.body.user;

    // listName => listId
    const listSqlSearch = "Select id from lists where name = ?"
    const listSearchQuery = con.format(listSqlSearch, [listName])

    con.query(listSearchQuery, (err, result) =>{
        if (err) throw err
        if (result[0] == null){
            return res.status(404).send("List doesnt exist")
        }

        const listId = JSON.parse(JSON.stringify(result))

        // check if logged in user owns the list
        const checkUser = "select user_id from list_users where list_id = ?"
        const checkUserQuery = con.format(checkUser, [listId[0].id])

        con.query(checkUserQuery, (err, result) =>{
            if (err) throw err

            const userId = JSON.parse(JSON.stringify(result))
            if(userId[0].user_id != loggedInUserId){
                res.send("Logged in user cannot share this list")
            }
            else{

                const userIdSearch = "select id from users where name = ?"
                const userIdQuery = con.format(userIdSearch, [user])

                con.query(userIdQuery, (err, result) =>{
                    if (err) throw err

                    const addUserId = JSON.parse(JSON.stringify(result))

                    if (addUserId[0] == null){
                        return res.status(404).send("User doesnt exist")
                    }
                    else if (addUserId[0].id == loggedInUserId){
                        return res.status(400).send("User already has access to this")
                    }
                

                    for (let i = 0; i < userId.length; i++){
                        if (userId[i].user_id == addUserId[0].id){
                            return res.status(400).send("User already has access to this")
                        }
                    }

                    const sqlInsert = "insert into list_users values (?, ?)"
                    const insertQuery = con.format(sqlInsert, [listId[0].id, addUserId[0].id])

                    con.query(insertQuery, (err, result) =>{
                        if (err) throw err

                        res.status(201).send("Added user to list")

                    })
                })
            }
        })
    })
})

// PORT
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on port ${port}...`))