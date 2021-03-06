const express = require("express");
const router = express.Router();
const db = require("../../config/connection");
const passport = require("passport");
const secret = require("../../config/secret");

// Loading Input Validation
const validateRubricInput = require("../../validation/rubric");

//Loading weight update validation
const rubricWeightValidate = require("../../validation/rubricWeight");

// @route   GET api/rubrics
// @desc    Gets the lists of all rubrics
// @access  Private
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = req.user.email;
    const type = req.user.type;
    const dept = db.escape(req.user.dept);

    Rubrics = [];
    if (type == "Admin") {
      let sql =
        "SELECT * FROM RUBRIC natural join RUBRIC_SCALE where isVisible = 'true' AND Dept_ID = " +
        dept +
        " order by Rubric_Name";

      // console.log(sql);
      db.query(sql, (err, result) => {
        // var RubricsIDToObject=new Map();

        if (err) return res.send(err);

        let i = 0;

        while (i < result.length) {
          let Rubric_ID = result[i].Rubric_ID;
          let ScaleSize = result[i].Scale;
          aRubric = {
            Rubric_ID: result[i].Rubric_ID,
            Rubrics_Name: result[i].Rubric_Name,
            Rows_Num: result[i].Rows_Num,
            Column_Num: result[i].Column_Num,
            isWeighted: result[i].isWeighted,
            ScaleSize: result[i].Scale
          };
          Scales = [
            {
              label: result[i].Score_label,
              value: result[i].Value
            }
          ];

          for (j = 0; j < ScaleSize - 1; j++) {
            i++;
            score = {
              label: result[i].Score_label,
              value: result[i].Value
            };
            Scales.push(score);
          }
          aRubric.Scales = Scales;
          Rubrics.push(aRubric);
          i++;
        }

        // console.log(Rubrics);
        res.json(Rubrics);
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/rubrics
// @desc    Create a new Rubric
// @access  Private
router.post(
  "/create",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields
    const rubricFields = {};
    let done = false;

    //console.log(req.body);
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);

    //console.log(req.user);
    if (type == "Admin") {
      const { errors, isValid } = validateRubricInput(req.body);

      if (!isValid) {
        return res.status(404).json(errors);
      }
      if (req.body.Rubric_Name)
        rubricFields.name = db.escape(req.body.Rubric_Name);
      if (req.body.Rows_Num) rubricFields.Rows_Num = req.body.Rows_Num;
      if (req.body.Column_Num) rubricFields.Column_Num = req.body.Column_Num;
      if (req.body.isWeighted) rubricFields.isWeighted = req.body.isWeighted;
      if (req.body.Scale) {
        rubricFields.Scale = req.body.Scale;
        rubricFields.ScaleSize = db.escape(req.body.Scale.length);
      }

      let isVisible = "true";
      let sql =
        "SELECT Rubric_ID FROM RUBRIC WHERE isVisible='true' AND Dept_ID =" +
        dept +
        " AND Rubric_Name=" +
        rubricFields.name;

      db.query(sql, (err, result) => {
        if (err) throw err;
        else {
          if (result.length > 0) {
            errors.Rubric_Name = "Rubric with that name already exists.";
            return res.status(404).json(errors);
          }
          sql =
            "INSERT INTO RUBRIC(Rubric_Name, Rows_Num, Column_Num,Scale,Dept_ID,isWeighted,isVisible) VALUES(" +
            rubricFields.name +
            "," +
            rubricFields.Rows_Num +
            "," +
            rubricFields.Column_Num +
            "," +
            rubricFields.ScaleSize +
            "," +
            dept +
            "," +
            rubricFields.isWeighted +
            "," +
            isVisible +
            ")";
          //console.log(sql);

          // CREATE RUBRIC_ROW TABLE WITH Rows_Num and Column_Num
          db.query(sql, (err, result) => {
            if (err)
              return res
                .status(400)
                .json({ error: "There was some problem adding it" });
            else {
              let Rubric_ID = db.escape(result.insertId);
              rubricFields.Scale.forEach(grade => {
                let label = db.escape(grade.label);
                let value = grade.value;
                let newSql =
                  "INSERT INTO RUBRIC_SCALE(Rubric_ID, Score_label, Value) VALUES(" +
                  Rubric_ID +
                  "," +
                  label +
                  "," +
                  value +
                  ")";

                db.query(newSql, (err, result) => {});
              });

              let empty_var = "";
              // console.log(empty_var);
              // console.log(rubricFields.Rows_Num);

              //adding equal weight to all the rows
              let weight = 100 / rubricFields.Rows_Num;

              let row = 1;

              let newSql1 =
                "INSERT INTO RUBRIC_ROW(Rubric_ID,Measure_Factor,Sort_Index,Rubric_Row_Weight) VALUES ?";

              let sqls = [];

              for (var i = 1; i <= rubricFields.Rows_Num; i++) {
                value = [];
                value.push(Rubric_ID);
                value.push(empty_var);
                value.push(i);
                value.push(weight);

                sqls.push(value);
              }
              db.query(newSql1, [sqls], function(err, result) {
                if (err) {
                  throw err;
                } else {
                  sql =
                    "SELECT Rubric_Row_ID FROM RUBRIC_ROW WHERE Rubric_ID = " +
                    Rubric_ID;

                  db.query(sql, (err, result) => {
                    if (err) throw err;
                    else {
                      let newSql2 =
                        "INSERT INTO COLUMNS(Rubric_Row_ID,Column_No,Value) VALUES ?";
                      sqls = [];
                      result.forEach(row => {
                        Rubric_Row_ID = row.Rubric_Row_ID;

                        for (var j = 1; j <= rubricFields.Column_Num - 1; j++) {
                          value = [];
                          value.push(Rubric_Row_ID);
                          value.push(j);
                          value.push(empty_var);

                          sqls.push(value);
                        }
                      });
                      db.query(newSql2, [sqls], function(err, result) {
                        if (err) {
                          throw err;
                        } else {
                          res
                            .status(200)
                            .json((Rubric = { Rubric_ID: Rubric_ID }));
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   GET api/rubrics/rubrics:handle
// @desc    get the values of a Rubric
// @access  Private route
router.get(
  "/:handle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Rubric_ID = req.params.handle;
    const Rubric = {};
    if (type == "Admin") {
      let sql =
        "SELECT * FROM RUBRIC where isVisible='true' AND Rubric_ID =" +
        Rubric_ID +
        " AND DEPT_ID = " +
        dept;

      db.query(sql, (err, result) => {
        var Rubrics = {};
        if (err) throw err;
        else {
          if (result.length < 1) {
            return res.status(404).json({ error: "Rubric Not Found" });
          }
          Rubric.Rubric_ID = Rubric_ID;
          Rubric.Rubric_Name = result[0].Rubric_Name;
          Rubric.Rows_Num = result[0].Rows_Num;
          Rubric.Column_Num = result[0].Column_Num;
          Rubric.isWeighted = result[0].isWeighted;
          Rubric.Scale = [];
          Rubric.data = [];

          sql =
            "SELECT * FROM RUBRIC NATURAL JOIN RUBRIC_SCALE WHERE Rubric_ID =" +
            Rubric_ID +
            " ORDER BY Value ASC";

          db.query(sql, (err, result) => {
            if (err) return res.status(404).json(err);
            else {
              result.forEach(grade => {
                let aScale = {
                  label: grade.Score_label,
                  value: grade.Value
                };
                Rubric.Scale.push(aScale);
              });
              var newSql =
                "SELECT * FROM RUBRIC_ROW WHERE Rubric_ID =" +
                Rubric_ID +
                " ORDER BY Sort_Index";

              db.query(newSql, (err, result) => {
                if (err) throw err;
                else {
                  //let done = false;
                  let rowIndex = 0;
                  const totalRows = result.length;
                  result.forEach(row => {
                    var Rubric_Row_ID = row.Rubric_Row_ID;

                    var Rubric_Row_Weight = row.Rubric_Row_Weight;

                    var Sort_Index = row.Sort_Index;
                    var Measure_Factor = row.Measure_Factor;
                    var Column_values = [];
                    var newSql2 =
                      "SELECT * FROM COLUMNS WHERE Rubric_Row_ID =" +
                      Rubric_Row_ID +
                      " ORDER BY Column_No";

                    db.query(newSql2, (err, result) => {
                      if (err) return res.status(404).json(err);
                      else {
                        let columnIndex = 0;
                        const totalColumn = result.length;
                        result.forEach(row => {
                          var eachColumn = {
                            Column_ID: row.Columns_ID,
                            Column_No: row.Column_No,
                            value: row.Value
                          };
                          columnIndex++;
                          Column_values.push(eachColumn);
                        });

                        var eachRow = {
                          Rubric_Row_ID: Rubric_Row_ID,
                          Rubric_Row_Weight: Rubric_Row_Weight,
                          Measure_Factor: Measure_Factor,
                          Column_values: Column_values
                        };
                        Rubric.data.push(eachRow);
                        rowIndex++;
                        if (
                          rowIndex == totalRows &&
                          columnIndex == totalColumn
                        ) {
                          return res.json(Rubric);
                        }
                      }
                    });
                  });
                }
              });
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/rubrics/measures/update/:handle
// @desc    update the changes in a measure factor of a rubric
// @access  Private route
router.post(
  "/measure/update/:handle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Rubric_Row_ID = req.params.handle;
    const value = db.escape(req.body.Measure_Factor);
    if (type == "Admin") {
      let sql =
        "UPDATE  RUBRIC_ROW SET Measure_Factor = " +
        value +
        " WHERE Rubric_Row_ID = " +
        Rubric_Row_ID;

      db.query(sql, (err, result) => {
        if (err) throw err;
        else {
          res.status(200).json({ message: "Successfully updated the cell" });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   UPDATE api/rubrics/:rubricsID/weight
// @desc    update the changes in  a measure factor of a rubric
// @access  Private route
router.put(
  "/:rubricsID/weight",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Rubric_ID = req.params.handle;
    const data = req.body;

    // console.log(req.body);
    if (type == "Admin") {
      const { errors, isValid } = rubricWeightValidate(data);

      if (!isValid) {
        return res.status(422).json(errors);
      }

      let sql = "";

      data.forEach(row => {
        let Rubric_Row_ID = row.Rubric_Row_ID;
        let Rubric_Row_Weight = row.Rubric_Row_Weight;

        sql +=
          "UPDATE  RUBRIC_ROW SET Rubric_Row_Weight = " +
          Rubric_Row_Weight +
          " WHERE Rubric_Row_ID = " +
          Rubric_Row_ID +
          ";";
      });

      db.query(sql, (err, result) => {
        if (err) throw err;
        else {
          res.status(200).json({ message: "Successfully updated the weight" });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/rubrics/column/update/:handle
// @desc    update the changes in  a column cell
// @access  Private route
router.post(
  "/column/update/:handle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Columns_ID = req.params.handle;
    const value = db.escape(req.body.Value);

    if (type == "Admin") {
      let sql =
        "UPDATE  COLUMNS SET Value = " +
        value +
        " WHERE Columns_ID = " +
        Columns_ID;

      db.query(sql, (err, result) => {
        if (err) throw err;
        else {
          res.status(200).json({ message: "Successfully updated the cell" });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   DELETE api/rubrics/:rubricID
// @desc    Delete a given rubric
// @access  Private route
router.delete(
  "/:rubricID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    //Get Fields

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);

    const Rubric_ID = req.params.rubricID;

    if (type == "Admin") {
      let sql =
        "SELECT * FROM RUBRIC WHERE Rubric_ID=" +
        Rubric_ID +
        " AND Dept_ID=" +
        dept;

      db.query(sql, (err, result) => {
        if (err) {
          return res.status(400).json(err);
        } else {
          if (result.length < 1) {
            return res.status(404).json({ Rubric_ID: "Rubric Not found" });
          } else {
            sql =
              "SELECT  *  FROM RUBRIC_MEASURES WHERE Rubric_ID=" + Rubric_ID;

            db.query(sql, (err, result) => {
              if (err) {
                return res.status(400).json(err);
              }
              if (result.length > 0) {
                return res.status(400).json({
                  Rubric_ID: "Rubric has been associated with cycles."
                });
              } else {
                sql = "DELETE FROM RUBRIC_SCALE WHERE Rubric_ID=" + Rubric_ID;

                db.query(sql, (err, result) => {
                  if (err) {
                    return res.status(400).json(err);
                  } else {
                    sql =
                      "SELECT  Rubric_Row_ID FROM RUBRIC_ROW WHERE Rubric_ID=" +
                      Rubric_ID;
                    db.query(sql, (err, result) => {
                      if (err) {
                        return res.status(400).json(err);
                      } else {
                        sql = "";
                        result.forEach(row => {
                          sql +=
                            " DELETE FROM COLUMNS WHERE Rubric_Row_ID=" +
                            row.Rubric_Row_ID +
                            "; ";
                        });
                        db.query(sql, (err, result) => {
                          if (err) {
                            return res.status(400).json(err);
                          } else {
                            sql =
                              "DELETE FROM RUBRIC_ROW WHERE Rubric_ID=" +
                              Rubric_ID;
                            db.query(sql, (err, result) => {
                              if (err) {
                                return res.status(400).json(err);
                              } else {
                                sql =
                                  "DELETE  FROM RUBRIC WHERE Rubric_ID=" +
                                  Rubric_ID;
                                db.query(sql, (err, result) => {
                                  if (err) {
                                    return res.status(400).json(err);
                                  } else {
                                    return res.status(200).json({
                                      Rubric_ID: "Rubric successfully  deleted"
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

module.exports = router;
