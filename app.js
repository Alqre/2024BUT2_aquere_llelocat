//INITIALISATIONS DES CONSTANTES
const express = require('express');
const session = require('express-session');
const app = express();
const md5 = require('md5')
const userModel = require("./models/user.js");
const db = require("./models/database.js")

//INITIALISATION D'EXPRESS.JS
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }))

app.use(session({
    secret: 'pamplemousse',
    resave: false,
    saveUninitialized: false
}));

//MIDDLEWARE - MISE EN PLACE DE VARIABLES GLOBALES
app.use(function (req, res, next) {
    if (req.session.userId) {
        res.locals.isAuth = true;
        res.locals.id = req.session.userId;
        res.locals.role = req.session.role;
        res.locals.nom = req.session.nom;
        res.locals.prenom = req.session.prenom;
    }
    else {
        res.locals.isAuth = false;
    }
    next()
})

//PAGE INDEX/MENU
app.get('/', async function (req, res) {
    res.render("index", { error: null });
});

//PAGE CATALOGUE
app.get('/catalogue', async function (req, res) {

    //AFFECTATIONS DES PRODUITS DE LA BDD DANS LA CONSTANTE PRODUCT
    const product = await userModel.getProductsById()

    //AFFICHAGE DE LA PAGE CATALOGUE
    res.render("catalogue", { error: null, product: product });
});

//PAGE DE CONNEXION
app.get('/login', async function (req, res) {

    //AFFICHAGE DE LA PAGE DE CONNEXION
    res.render("login", { error: null });
});

//SYSTÈME DE DÉCONNEXION
app.get('/logout', (req, res) => {

    //RENVOIE À LA PAGE INDEX
    res.redirect('/')

    //SUPPRESSION DE LA SESSION (DÉCONNEXION)
    req.session.destroy(err => {
        if (err) {
            console.error(err); // Log l'erreur si la destruction de session échoue
            return res.redirect('/'); // Redirige vers la page d'accueil en cas d'erreur
        }
    })
})

//SYSTÈME DE CONNEXION
app.post('/connexion', async function (req, res) {

    //AFFECTATION DU LOGIN ET DU MOT DE PASSE DANS UNE CONSTANTE ET UNE VARIABLE
    const login = req.body.login;
    let mdp = req.body.password;

    //CHIFFREMENT DU MOT DE PASSE POUR LE RECONNAITRE DANS LA BASE DE DONNÉE
    mdp = md5(mdp);

    //AFFECTATIONS DES DONNÉES DE L'UTILISATEUR À TRAVERS LA FONCTION CHECKLOGIN
    const user = await userModel.checklogin(login);
    if (user && user.password == mdp) {
        req.session.userId = user.id;
        req.session.role = user.type_utilisateur;
        req.session.nom = user.nom;
        req.session.prenom = user.prenom;

        //REDIRECTION VERS LA PAGE INDEX
        return res.redirect("/");
    }
    else {

        //AFFICHAGE DE LA PAGE LOGIN AVEC UNE ERREUR
        res.render("login", { error: "Mauvais nom d'utilisateur/mot de passe" });
    }
})

//PAGE CRÉATION GÉRANT
app.get('/creationgerant', (req, res) => {

    //ACCÈS À LA PAGE SEULEMENT EN TANT QU'ADMIN
    if (req.session.role == "admin") {

        //AFFICHAGE DE LA PAGE
        res.render("creationgerant", { error: null })
    }

    //RENVOIE À LA PAGE INDEX
    else { res.redirect('/') };
});

//SYSTÈME DE CRÉATION D'UN GÉRANT
app.post('/creationgerant', async (req, res) => {

    //AFFECTATIONS DES DONNÉES ENTRÉES DANS LE FORMULAIRE
    const { login, nom, prenom, ddn, email, mdp } = req.body;
    const type_utilisateur = "agent";
    try {
        
        //VÉRIFICATION DE SI L'UTILISATEUR EXISTE DÉJÀ
        db.query('SELECT * FROM utilisateur WHERE email = ?', [email], async (err, results) => {
            if (err) throw err;

            if (results.length > 0) {
                return res.status(400).send('Cet email est déjà utilisé.');
            }

            //CHIFFREMENT DU MOT DE PASSE
            const hashedPassword = md5(mdp);

            //INSÈRE LE GÉRANT DANS LA BDD
            db.query('INSERT INTO utilisateur (login, nom, prenom, ddn, email, password, type_utilisateur) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [login, nom, prenom, ddn, email, hashedPassword, type_utilisateur],
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

//PAGE PRODUIT
app.get('/produit/:id', async function (req, res) {
    const id = parseInt(req.params.id);
    const product = await userModel.getProductById(id)
    const location = await userModel.getLocationById(id)
    const existe = !!location;
    res.render("produit", { error: null, product: product, existe: existe, location: location });
});

//PAGE AJOUTER UN PRODUIT - 
app.get('/ajouterproduit', (req, res) => {
    //ACCÈS À LA PAGE SEULEMENT EN TANT QUE GÉRANT
    if (req.session.role == "agent") {
        res.render("ajouterproduit", { error: null })
    }
    else { res.redirect('/') };
});

//SYSTÈME POUR AJOUTER UN PRODUIT
app.post('/ajouterproduit', async (req, res) => {
    const { type, description, marque, modele, prix_location, etat } = req.body;
    try {
        db.query('INSERT INTO produit (type, description, marque, modele, prix_location, etat) VALUES (?, ?, ?, ?, ?, ?)',
            [type, description, marque, modele, prix_location, etat],
            (err, results) => {
                if (err) throw err;
                res.redirect("/");
            }
        );
        ;
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

//PAGE D'INSCRIPTION
app.get('/inscription', (req, res) => {
    if (res.locals.isAuth == false) {
        res.render("inscription", { error: null })
    }
    else { res.redirect('/') };
});

//SYSTÈME D'INSCRIPTION
app.post('/inscription', async (req, res) => {
    const { login, nom, prenom, ddn, email, mdp } = req.body;
    const type_utilisateur = "client";
    try {
        db.query('SELECT * FROM utilisateur WHERE email = ?', [email], async (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
                return res.status(400).send('Cet email est déjà utilisé.');
            }
            const hashedPassword = md5(mdp);
            db.query('INSERT INTO utilisateur (login, nom, prenom, ddn, email, password, type_utilisateur) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [login, nom, prenom, ddn, email, hashedPassword, type_utilisateur],
                (err, results) => {
                    if (err) throw err;
                    res.redirect("/login");
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
})

//PAGE COMPTE UTILISATEUR
app.get('/moncompte', (req, res) => {
    if (res.locals.isAuth == true) {
        res.render("moncompte", { error: null })
    }
    else { res.redirect('/') };
});

//SYSTÈME DE MODIFICATION DES DONNÉES UTILISATEUR
app.post('/moncompte', async (req, res) => {
    const { id, nom, prenom, ddn, email, mdp } = req.body;
    try {
        db.query('SELECT * FROM utilisateur WHERE email = ?', [email], async (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
                return res.status(400).send('Cet email est déjà utilisé.');
            }
            const hashedPassword = md5(mdp);
            db.query('UPDATE utilisateur SET nom = ?, prenom = ?, ddn = ?, email = ?, password = ? WHERE id = ? ',
                [nom, prenom, ddn, email, hashedPassword, id],
                (err, results) => {
                    if (err) throw err;
                    res.redirect("/login");
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
})

//SYSTÈME DE SUPPRESSION D'UN PRODUIT
app.get('/supprimerproduit/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (req.session.role !== "agent") {
        return res.redirect('/catalogue');
    }
    db.query(
        'SELECT EXISTS (SELECT * FROM location WHERE produit_id = ?) AS is_present',
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Une erreur s'est produite.");
            }
            const isPresent = results[0].is_present;
            if (isPresent) {
                return res.status(400).send("Le produit est en location, vous ne pouvez pas le supprimer. <a href='/catalogue'>Revenir au catalogue</a>");
            }
            db.query('DELETE FROM produit WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Une erreur s'est produite.");
                }
                res.redirect('/catalogue');
            });
        }
    );
})

//SYSTÈME DE SUPPRESION DE COMPTE
app.get('/supprimercompte', async (req, res) => {
    const id = req.session.userId;
    if (req.session.role !== "client") {
        return res.redirect('/catalogue');
    }
    db.query(
        'SELECT EXISTS (SELECT * FROM location WHERE utilisateur_id = ?) AS is_present',
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Une erreur s'est produite.");
            }
            const isPresent = results[0].is_present;
            if (isPresent) {
                return res.status(400).send("Vous possédez un produit en location, vous ne pouvez pas supprimez votre compte. <a href='/'>Revenir au menu</a>");
            }
            db.query('DELETE FROM utilisateur WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Une erreur s'est produite.");
                }
                res.redirect('/logout');
            });
        }
    );
})

//SYSTÈME D'AJOUT DE LOCATION
app.post('/ajouterlocation', async (req, res) => {
    const { date_debut, date_retour_prevue, utilisateur_id, produit_id } = req.body;
    const product = await userModel.getProductById(produit_id)
    const date_deb = new Date(date_debut);
    const date_retour = new Date(date_retour_prevue);
    const temps_total = date_retour.getTime() - date_deb.getTime();
    let reduction = 1
    if (temps_total >= 604800000) {
        reduction = 0.90
    }
    const prix_journalier = (5 * temps_total) / 86400000
    prix_total = (product.prix_location + prix_journalier) * reduction - 12
    try {
        db.query('INSERT INTO location (date_debut, date_retour_prevue, prix_total, utilisateur_id, produit_id ) VALUES (?, ?, ?, ?, ?)',
            [date_debut, date_retour_prevue, prix_total, utilisateur_id, produit_id],
            (err, results) => {
                if (err) throw err;
                res.redirect("/catalogue");
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

//SYSTÈME DE SUPPRESSION DE LOCATION
app.get('/supprimerlocation/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const location = await userModel.getLocationById(id);
        const existe = !!location;
        if (!existe) {
            return res.status(400).send("Ce produit n'est pas loué. <a href='/catalogue'>Revenir au catalogue</a>");
        }
        if (req.session.userId !== location.utilisateur_id) {
            return res.status(400).send("Vous ne louez pas ce produit. <a href='/catalogue'>Revenir au catalogue</a>");
        }
        if (existe) {
            const datedebut = new Date(location.date_debut);
            const dateauj = new Date();
            if (datedebut.getTime() <= dateauj.getTime()) {
                return res.status(400).send("La location a déjà commencée, vous ne pouvez plus l'annuler. <a href='/catalogue'>Revenir au catalogue</a>");
            }
        }
        db.query('DELETE FROM location WHERE produit_id = ?', [id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur du serveur.');
            }
            return res.redirect('/catalogue');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

//SYSTÈME DE VALIDATION D'UNE LOCATION
app.get('/validerlocation/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const location = await userModel.getLocationById(id);
        const existe = !!location;
        if (!existe) {
            return res.status(400).send("Ce produit n'est pas loué. <a href='/catalogue'>Revenir au catalogue</a>");
        }
        if (existe) {
            const datefin = new Date(location.date_retour_prevue);
            const dateauj = new Date();
            if (datefin.getTime() >= dateauj.getTime()) {
                return res.status(400).send("La location n'est pas terminée, vous ne pouvez pas valider la location. <a href='/catalogue'>Revenir au catalogue</a>");
            }
        }
        db.query('DELETE FROM location WHERE produit_id = ?', [id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur du serveur.');
            }
            return res.redirect('/catalogue');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

//AFFICHAGE DE LA PAGE D'ERREUR 404
app.use(function (req, res) {
    res.status(404).render("404");
})

//DÉFINITION DU PORT POUR LE SERVEUR ET LANCEMENT DU SERVEUR
app.listen(3000, function () {
    console.log('Server running on port 3000');
});