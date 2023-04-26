const sqlite3 = require('sqlite3').verbose();

module.exports = class SqliteConnectionService {
    static instance = null;
    static db = null;

    static getInstance() {
        if (SqliteConnectionService.instance == null) {
            this.instance = new SqliteConnectionService();
            this.instance.openConnection();
        }

        return this.instance;
    }

    openConnection() {
        // open the database
        this.db = new sqlite3.Database('./db/database.db', sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Connected to the database.');
        });
    }

    /**
     * Queries the SQLite Database and returns a promise with the results
     * @param {string} query - The database query
     * @returns {Promise<string[]>}
     */
    async query(query) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        });
    }

    closeConnection() {
        this.db.close();
    }
}