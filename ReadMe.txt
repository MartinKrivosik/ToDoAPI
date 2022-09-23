Návod na použitie:

Ako pridať vlastnú databázu:

V súbore config.js je potrebné upraviť atribúty v connection:

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: '4306',
    password: "1234",
    database: 'test'
});


Endpointy:

Všetky vstupy do endpointov sú potrebné a nemôžu zostať prázdne.

GET/allUsers
 - vstup: bez vstupu
 - vypíše mená všetkých zaregistrovaných použivateľov

POST/createUser
 - vstup:
{
    "name": "username",
    "password": "password"
}
 - aj meno aj heslo su case sensitive a whitespace je akceptovaný znak
 - vytvorí použivateľa, do databázy uloží meno a zašifrované heslo
 - výstup: status: 201 s výpisom "User successfully created"

POST/login
 - vstup:
{
    "name": "username",
    "password": "password"
}
 - zapíše meno a id prihláseného uživateľa, dokým sa neprihlási nový
 - výstup: status: 200 s výpisom " ${user} is logged in"

POST/createList
 - vstup:
{
    "name": "listName"
}
 - vytvorí list, ktorý je spojený s prihláseným uživateľom, ktory ho vytvoril
 - musí byť prihlásený použivateľ, aby mohol vytvoriť zoznam
 - výstup: status: 201 s výpisom "Created list and connected it to user ´${loggedInUserName}´ "

POST/createActivity
 - vstup:
{
    "name":"activityName",
    "description":"activityDescription",
    "deadline":"date"
}
 - vytvorí aktivitu s menom, popisom a deadline podľa vstupu
 - deadline je potrebné zadať vo formáte YYYY-MM-DD a nemôže byť neskôr než dnešný dátum
 - musí byť prihlásený použivateľ, aby mohol vytvoriť aktivitu
 - výstup: status: 201 s výpisom "Created activity"

PUT/addActivityToList
 - vstup:
{
    "listName": "listName",
    "activityName": "activityName"
} 
 - spojí aktivitu s daným menom so zoznamom s daným menom
 - musí byť prihlásený použivateľ a musí mať prístup k danému zoznamu, aby mohol spojiť aktivitu s listom
 - výstup: status: 200 s výpisom "Added activity to list"

GET/getActivitiesFromList
 - vstup:
{
    "listName": "listName"
}
 - vypíše všetky aktivity z daného listu
 - na volanie výpisu nemusí byť použivateľ prihlásený a ani nemusí mať upravovací prístup k listu
 - výstup: status 200 s výpisom:
[
    {
        "name":"activityName",
    	"description":"activityDescription",
    	"deadline":"date"
        "flag": 0
    }
]
 - deadline je pri výstupe preformátovaná na tvar DD/MM/YYYY
 - flag je pri každej vytvorenej aktivite defaultne nastavená na 0

PUT/changeActivityFlag
 - vstup:
{
    "listName": "listName",
    "activityName": "activityName",
    "flag": "flag"
}
 - zmení flag aktivity v danom liste
 - musí byť prihlásený použivateľ a musí mať prístup k danému zoznamu
 - vstup do atribútu "flag" je ľubovoľný string
 - výstup: status: 200 s výpisom "Flag updated"

DELETE/removeActivity
 - vstup:
{
    "listName": "listName",
    "activityName": "activityName"
}
 - odstráni aktivitu z daného listu
 - musí byť prihlásený použivateľ a musí mať prístup k danému zoznamu
 - výstup: status: 200 s výpisom "Deleted activity from list"

DELETE/deleteList
 - vstup:
{
    "listName": "listName"
}
 - odstráni zoznam z databázy
 - musí byť prihlásený použivateľ a musí mať prístup k danému zoznamu
 - výstup: status: 200 s výpisom "Deleted list"

POST/shareList
 - vstup:
{
    "listName": "listName",
    "user": "user"
}
 - pridá danému použivateľovi schopnosť upravovať zoznam
 (pridať/odstrániť aktivity do zoznamu, vymazať list, zdielať zoznam inému použivateľovi)
 - musí byť prihlásený použivateľ a musí mať prístup k danému zoznamu
 - výstup: status: 201 s výpisom "Added user to list"