const express = require('express');
const session = require('express-session');
const app = express();
const md5 = require('md5')
const userModel = require("./models/user.js");

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(express.urlencoded({ extented: false }))

app.use(session({
    secret: 'pamplemousse',
    resave: false,
    saveUnitialized: false
}));


app.get('/login', async function (req,res) {
    if (req.session.userId) {
        return res.redirect("login")
    }

    try {
        const user = await userModel.getUserById(2);
        res.render('index',{ user });
        console.log(user)
    } catch(err) {
        console.log(err);
        res.status(500).send('Erreur lors de la récupération des données')
    }})


app.get('/login', async function (req,res) {
    res.render("login", {error: null});
});
 

app.post ('/connexion', async function (req, res) {
    const login = req.body.login;
    let mdp = req.body.password;

    mdp = md5(mdp);

    const user = await userModel.checklogin(login);

    if(user != false && user.password == mdp){
        req.session.userId = user.id;
        req.session.role = user.type_utilisateur;
        return res.redirect("/");
    }
    else {
        res.render("login", {error: "Mauvais mot de passe"});
    }
})


app.use(function (req,res){
    res.status(404).render("404");
})

app.listen(3000, function(){
    console.log('Server running on port 3000');
});