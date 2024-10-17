const express = require('express');
const session = require('express-session');
const app = express();
const md5 = require('md5')
const userModel = require("./models/user.js");

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }))

app.use(session({
    secret: 'pamplemousse',
    resave: false,
    saveUninitialized: false
}));

app.use(function(req,res,next){
    if(req.session.userId){
        res.locals.isAuth = true;
        res.locals.id = req.session.userId;
        res.locals.role = req.session.role;
        res.locals.nom = req.session.nom;
        res.locals.prenom = req.session.prenom;}
    else{
        res.locals.isAuth = false;
    }
    next()
})

app.get('/', async function (req,res) {
    res.render("index", {error: null});
});

app.get('/catalogue', async function (req,res) {
    res.render("catalogue", {error: null});
});

app.get('/login', async function (req,res) {
    res.render("login", {error: null});
});
 
app.get('/logout', (req, res) => {
    res.redirect('/')
    req.session.destroy(err => {
        if (err) {
            console.error(err); // Log l'erreur si la destruction de session échoue
            return res.redirect('/'); // Redirige vers la page d'accueil en cas d'erreur
        }})})

app.post ('/connexion', async function (req, res) {
    const login = req.body.login;
    let mdp = req.body.password;

    mdp = md5(mdp);

    const user = await userModel.checklogin(login);

    if(user != false && user.password == mdp){
        req.session.userId = user.id;
        req.session.role = user.type_utilisateur;
        req.session.nom = user.nom;
        req.session.prenom = user.prenom;
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