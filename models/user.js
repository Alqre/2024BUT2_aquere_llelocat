const bdd = require("./database.js")

async function getUserById (id) {
    sql = "SELECT * FROM utilisateur WHERE id = ?";
    return new Promise((resolve, reject) => {
        bdd.query(sql, id, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

async function checklogin (login) {
    sql = "SELECT * FROM utilisateur WHERE login = ?";
    return new Promise((resolve, reject) => {
        bdd.query(sql, login, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results[0]);
        });
    });
};



module.exports = {getUserById, checklogin};