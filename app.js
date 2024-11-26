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

app.get('/', async function (req, res) {
    res.render("index", { error: null });
});

app.get('/catalogue', async function (req, res) {
    const product = await userModel.getProductsById()
    res.render("catalogue", { error: null, product: product });
});

app.get('/login', async function (req, res) {
    res.render("login", { error: null });
});

app.get('/logout', (req, res) => {
    res.redirect('/')
    req.session.destroy(err => {
        if (err) {
            console.error(err); // Log l'erreur si la destruction de session échoue
            return res.redirect('/'); // Redirige vers la page d'accueil en cas d'erreur
        }
    })
})

app.post('/connexion', async function (req, res) {
    const login = req.body.login;
    let mdp = req.body.password;

    mdp = md5(mdp);

    const user = await userModel.checklogin(login);
    if (user && user.password == mdp) {
        req.session.userId = user.id;
        req.session.role = user.type_utilisateur;
        req.session.nom = user.nom;
        req.session.prenom = user.prenom;
        return res.redirect("/");
    }
    else {
        res.render("login", { error: "Mauvais nom d'utilisateur/mot de passe" });
    }
})

app.get('/creationgerant', (req, res) => {
    if (req.session.role == "admin") {
        res.render("creationgerant", { error: null })
    }
    else { res.redirect('/') };
});

// Route pour traiter les inscriptions
app.post('/creationgerant', async (req, res) => {
    const { login, nom, prenom, ddn, email, mdp } = req.body;
    const type_utilisateur = "agent";
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

app.get('/produit/:id', async function (req, res) {
    const id = parseInt(req.params.id);
    const product = await userModel.getProductById(id)
    const location = await userModel.getLocationById(id)
    const existe = !!location;

    res.render("produit", { error: null, product: product, existe: existe, location: location });
});

app.get('/ajouterproduit', (req, res) => {
    if (req.session.role == "agent") {
        res.render("ajouterproduit", { error: null })
    }
    else { res.redirect('/') };
});

app.get('/inscription', (req, res) => {
    if (res.locals.isAuth == false) {
        res.render("inscription", { error: null })
    }
    else { res.redirect('/') };
});

app.post('/inscription', async (req, res) => {
    const { login, nom, prenom, ddn, email, mdp } = req.body;
    const type_utilisateur = "client";
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

app.get('/moncompte', (req, res) => {
    if (res.locals.isAuth == true) {
        res.render("moncompte", { error: null })
    }
    else { res.redirect('/') };
});

app.post('/moncompte', async (req, res) => {
    const { id, nom, prenom, ddn, email, mdp } = req.body;
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

// Route pour traiter les inscriptions
app.post('/ajouterproduit', async (req, res) => {
    const { type, description, marque, modele, prix_location, etat } = req.body;
    try {
        // Vérifier si l'utilisateur existe déjà

        // Insérer l'utilisateur dans la base de données
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



// Route pour traiter les inscriptions
app.get('/supprimerproduit/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    // Vérifiez si l'utilisateur a le rôle "agent"
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

app.get('/supprimercompte', async (req, res) => {
    const id = req.session.userId;

    // Vérifiez si l'utilisateur a le rôle "agent"
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
        // Vérifier si l'utilisateur existe déjà

        // Insérer l'utilisateur dans la base de données
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

app.get('/supprimerlocation/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        // Récupérer la location à partir de l'ID
        const location = await userModel.getLocationById(id);

        // Vérifier si la location existe
        const existe = !!location;

        // Si la location n'existe pas
        if (!existe) {
            return res.status(400).send("Ce produit n'est pas loué. <a href='/catalogue'>Revenir au catalogue</a>");
        }

        // Vérifier si l'utilisateur a loué ce produit
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

        // Si la location existe et l'utilisateur a loué le produit, procéder à la suppression
        db.query('DELETE FROM location WHERE produit_id = ?', [id], (err, results) => {
            if (err) {
                // Gestion de l'erreur si la requête échoue
                console.error(err);
                return res.status(500).send('Erreur du serveur.');
            }

            // Si tout se passe bien, rediriger l'utilisateur
            return res.redirect('/catalogue');
        });
    } catch (err) {
        // Gestion des erreurs liées à la récupération de la location
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

app.get('/validerlocation/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        // Récupérer la location à partir de l'ID
        const location = await userModel.getLocationById(id);

        // Vérifier si la location existe
        const existe = !!location;

        // Si la location n'existe pas
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

        // Si la location existe et l'utilisateur a loué le produit, procéder à la suppression
        db.query('DELETE FROM location WHERE produit_id = ?', [id], (err, results) => {
            if (err) {
                // Gestion de l'erreur si la requête échoue
                console.error(err);
                return res.status(500).send('Erreur du serveur.');
            }

            // Si tout se passe bien, rediriger l'utilisateur
            return res.redirect('/catalogue');
        });
    } catch (err) {
        // Gestion des erreurs liées à la récupération de la location
        console.error(err);
        res.status(500).send('Erreur du serveur.');
    }
});

app.use(function (req, res) {
    res.status(404).render("404");
})

app.listen(3000, function () {
    console.log('Server running on port 3000');
});