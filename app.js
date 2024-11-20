const express = require('express');
const session = require('express-session');
const app = express();
const md5 = require('md5')
const userModel = require("./models/user.js");
const db = require("./models/database.js")


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
    const product = await userModel.getProductById()
    console.log(product)
    res.render("catalogue", {error: null, product: product});
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
    console.log(user)
    if(user && user.password == mdp){
        req.session.userId = user.id;
        req.session.role = user.type_utilisateur;
        req.session.nom = user.nom;
        req.session.prenom = user.prenom;
        return res.redirect("/");
    }
    else {
        res.render("login", {error: "Mauvais nom d'utilisateur/mot de passe"});
    }
})

app.get('/creationgerant', (req, res) => {
    if(req.session.role=="admin"){
        res.render("creationgerant",{error: null} )}
    else{res.redirect('/')};
});

// Route pour traiter les inscriptions
app.post('/creationgerant', async (req, res) => {
    const { login, nom, prenom, ddn, email, mdp } = req.body;
    const type_utilisateur= "agent";
    try {
        // Vérifier si l'utilisateur existe déjà
        db.query('SELECT * FROM utilisateur WHERE email = ?', [email], async (err, results) => {
            if (err) throw err;

            if (results.length > 0) {
                return res.status(400).send('Cet email est déjà utilisé.');
            }

            // Hasher le mot de passe
            const hashedPassword = md5(mdp);

            // Insérer l'utilisateur dans la base de données
            db.query('INSERT INTO utilisateur (login, nom, prenom, ddn, email, password, type_utilisateur) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [ login, nom, prenom, ddn, email, hashedPassword, type_utilisateur ], 
                (err, results) => {
                    if (err) throw err;
                    res.send('Utilisateur créé avec succès.');
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

app.get('/ajouterproduit', (req, res) => {
    if(req.session.role=="agent"){
    res.render("ajouterproduit", {error: null})}
    else{res.redirect('/')};
});

// Route pour traiter les inscriptions
app.post('/ajouterproduit', async (req, res) => {
    const { type, description, marque, modele, prix_location, etat } = req.body;
    try {
        // Vérifier si l'utilisateur existe déjà

            // Insérer l'utilisateur dans la base de données
            db.query('INSERT INTO produit (type, description, marque, modele, prix_location, etat) VALUES (?, ?, ?, ?, ?, ?)', 
                [ type, description, marque, modele, prix_location, etat ], 
                (err, results) => {
                    if (err) throw err;
                    res.send("Produit ajouté avec succès. <a href='/'>Retourner sur le site</a>");
                }
            );
        ;
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});



// Route pour traiter les inscriptions
app.get('/supprimerproduit/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
            db.query('DELETE FROM produit WHERE id = ?', 
                [id], 
                (err, results) => {
                    if (err) throw err;
                    res.redirect("/catalogue");
                }
            );
        ;
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});


app.use(function (req,res){
    res.status(404).render("404");
})

app.listen(3000, function(){
    console.log('Server running on port 3000');
});