const express = require("express");
const router = express.Router();
const db = require("../config/connection");
const passport = require("passport");
const secret = require("../config/secret");

let updateOutcome = Measure_ID => {
  let sql = " SELECT Outcome_ID  FROM MEASURES WHERE Measure_ID=" + Measure_ID;

  db.query(sql, (err, result) => {
    let Outcome_ID = result[0].Outcome_ID;

    sql =
      "SELECT COUNT(*) AS Total FROM MEASURES WHERE Outcome_ID=" + Outcome_ID;

    db.query(sql, (err, result) => {
      let Total_Measures = result[0].Total;

      sql =
        "SELECT COUNT(*) AS Success FROM MEASURES WHERE Outcome_ID=" +
        Outcome_ID +
        " AND isSuccess='true'";
      //   console.log(sql);
      db.query(sql, (err, result) => {
        let Success_Measures = result[0].Success;

        let isSuccess = "false";

        if (Total_Measures == Success_Measures) {
          isSuccess = "true";
        }

        sql =
          "SELECT COUNT(*) AS Success FROM MEASURES WHERE isSuccess='Pending' AND Outcome_ID=" +
          Outcome_ID;

        db.query(sql, (err, result) => {
          if (result[0].Success > 0) {
            isSuccess = "pending";
          }

          sql =
            "SELECT COUNT(*) AS Not_Started FROM MEASURES WHERE isSuccess='notStarted' AND Outcome_ID=" +
            Outcome_ID;

          db.query(sql, (err, result) => {
            if (result[0].Not_Started > 0) {
              isSuccess = "notStarted";
            }
            sql =
              "UPDATE OUTCOMES SET Outcome_Success=" +
              db.escape(isSuccess) +
              " WHERE Outcome_ID=" +
              Outcome_ID;

            db.query(sql, (err, result) => {
              // console.log(result);
            });
          });
        });
      });
    });
  });
};

module.exports = updateOutcome;
