const express = require("express");
const router = express.Router();
const db = require("../../config/connection");
const passport = require("passport");
const secret = require("../../config/secret");
var async = require("async");
const validateCycleInput = require("../../validation/cycle");
const Validator = require("validator");

const calculateMeasure = require("../calculateMeasure");

const validateUpdateRubric = require("../../validation/rubricMeasure");
// @route   GET api/cycle
// @desc    Gets the lists of all rubrics
// @access  Private

const isEmpty = require("../../validation/isEmpty");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = req.user.email;
    const type = req.user.type;
    const dept = req.user.dept;

    let sql =
      "SELECT * FROM ASSESSMENT_CYCLE WHERE Dept_ID = ('" +
      dept +
      "') order by Dept_ID DESC";
    db.query(sql, (err, result) => {
      var cycles = [];
      if (err) return res.send(err);
      else if (result.length > 0) {
        result.forEach(row => {
          aCycle = {
            Cycle_ID: row.Cycle_ID,
            Cycle_Name: row.Cycle_Name,
            Is_Submitted: row.Is_Submitted
          };
          cycles.push(aCycle);
        });
      }
      res.json(cycles);
    });
  }
);

// @route   POST api/cycle
// @desc    Create a new cycle
// @access  Private
router.post(
  "/create",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let { errors, isValid } = validateCycleInput(req.body);

    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    if (!isValid) {
      return res.status(404).json(errors);
    } else {
      //console.log(req.user);
      if (type == "Admin") {
        const name = db.escape(req.body.Cycle_Name);
        let sql =
          "SELECT Cycle_ID FROM ASSESSMENT_CYCLE WHERE Dept_ID =" +
          dept +
          " AND Cycle_Name=" +
          name;
        //console.log(sql);
        db.query(sql, (err, result) => {
          if (err) res.send(err);
          else {
            if (result.length > 0) {
              errors.Cycle_Name = "Cycle with that name already exists.";
              return res.status(404).json(errors);
            }

            let False = db.escape("false");
            sql =
              "INSERT INTO ASSESSMENT_CYCLE(Cycle_Name, Dept_ID,isSubmitted) VALUES(" +
              name +
              "," +
              dept +
              "," +
              False +
              ")";

            db.query(sql, (err, result) => {
              if (err)
                return res
                  .status(400)
                  .json({ error: "There was some problem adding it" });
              else {
                let Cycle_ID = db.escape(result.insertId);

                res.status(200).json((cycle = { Cycle_ID: Cycle_ID }));
              }
            });
          }
        });
      } else {
        res.status(404).json({ error: "Not an Admin" });
      }
    }
  }
);

// @route   GET api/cycle/cycle:handle
// @desc    get the list of outcomes of a given cycle
// @access  Private route
router.get(
  "/:handle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    if (type == "Admin") {
      const Cycle_ID = req.params.handle;
      const Cycle = {};

      let sql =
        "SELECT * FROM ASSESSMENT_CYCLE WHERE DEPT_ID =" +
        dept +
        " AND Cycle_ID = " +
        Cycle_ID;

      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length < 1) {
            return res.status(404).json({ error: "Cycle Not Found" });
          }

          Cycle.Cycle_ID = Cycle_ID;
          Cycle.Cycle_Name = result[0].Cycle_Name;
          Cycle.Is_Submitted = result[0].isSubmitted;
          Cycle.data = [];
          sql =
            "SELECT * FROM OUTCOMES WHERE Cycle_ID = " +
            Cycle_ID +
            " ORDER BY Outcome_Index";

          db.query(sql, (err, result) => {
            if (err) res.send(err);
            else {
              result.forEach(row => {
                outcome = {
                  Outcome_ID: row.Outcome_ID,
                  Outcome_Name: row.Outcome_Name,
                  Outcome_Index: row.Outcome_Index
                };

                Cycle.data.push(outcome);
              });

              return res.status(200).json(Cycle);
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/:cycleID/outcome/create
// @desc    Create a new outcome
// @access  Private
router.post(
  "/:cycleID/outcome/create",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Cycle_ID = db.escape(req.params.cycleID);
    console.log(req.body);
    let Outcome_Name = req.body.Outcome_Name;
    const errors = {};
    if (type == "Admin") {
      console.log(isEmpty(Outcome_Name));
      if (isEmpty(Outcome_Name)) {
        errors.Outcome_Name = "Outcome Name cannot be empty";
        return res.status(404).json(errors);
      }
      Outcome_Name = db.escape(Outcome_Name);
      let sql =
        "SELECT * FROM OUTCOMES NATURAL JOIN ASSESSMENT_CYCLE WHERE Dept_ID =" +
        dept +
        " AND Cycle_ID=" +
        Cycle_ID +
        " AND Outcome_Name =" +
        Outcome_Name;

      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length > 0) {
            errors.Cycle_Name = "Outcome with that name already exists.";
            return res.status(404).json(errors);
          }

          sql =
            "SELECT * FROM OUTCOMES NATURAL JOIN ASSESSMENT_CYCLE WHERE Dept_ID =" +
            dept +
            " AND Cycle_ID=" +
            Cycle_ID;

          db.query(sql, (err, result) => {
            if (err) res.send(err);
            else {
              if (err) {
                return res.status(404).json(err);
              }
              let Outcome_Index = 0;
              if (result.length != 0) {
                Outcome_Index = result[result.length - 1].Outcome_Index + 1;
              }

              sql =
                "INSERT INTO OUTCOMES(Cycle_ID, Outcome_Name, Outcome_Index) VALUES(" +
                Cycle_ID +
                "," +
                Outcome_Name +
                "," +
                Outcome_Index +
                ")";

              db.query(sql, (err, result) => {
                if (err)
                  return res
                    .status(400)
                    .json({ error: "There was some problem adding it" });
                else {
                  let Outcome_ID = db.escape(result.insertId);

                  res.status(200).json((outcome = { Outcome_ID: Outcome_ID }));
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

// @route   POST api/cycle/:cycleID/outcome/update
// @desc    Update an old outcome
// @access  Private
router.post(
  "/:cycleID/outcome/:outcomeID/update", // updated from /update/:outcomeID
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Cycle_ID = db.escape(req.params.cycleID);
    const Outcome_ID = db.escape(req.params.outcomeID);
    let Outcome_Name = req.body.Outcome_Name;
    let errors = {};

    if (type == "Admin") {
      if (isEmpty(Outcome_Name)) {
        return res
          .status(404)
          .json((errors = { Outcome_Name: "Outcome Name cannot be empty" }));
      }
      Outcome_Name = db.escape(Outcome_Name);
      let sql =
        "SELECT * FROM OUTCOMES NATURAL JOIN ASSESSMENT_CYCLE WHERE Dept_ID =" +
        dept +
        " AND Cycle_ID=" +
        Cycle_ID +
        " AND Outcome_Name =" +
        Outcome_Name;

      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length > 0) {
            errors.Outcome_Name = "Outcome with that name already exists.";
            return res.status(404).json(errors);
          }

          sql =
            "UPDATE OUTCOMES SET Outcome_Name = " +
            Outcome_Name +
            " WHERE Outcome_ID = " +
            Outcome_ID;

          db.query(sql, (err, result) => {
            if (err)
              return res
                .status(400)
                .json({ error: "There was some problem updating it" });
            else {
              res.status(200).json("Outcome was successfully updated");
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   GET api/cycle/outcome/outcome:handle
// @desc    get the list of measures of a given cycle
// @access  Private route
router.get(
  "/outcome/:handle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    let errors = {};
    if (type == "Admin") {
      const Outcome_ID = req.params.handle;
      const Outcome = {};

      let sql = "SELECT * FROM OUTCOMES WHERE Outcome_ID =" + Outcome_ID;

      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length < 1) {
            errors.Outcome_Name = "Outcome not found";
            return res.status(200).json(errors);
          }

          Outcome.Outcome_ID = Outcome_ID;
          Outcome.Cycle_ID = result[0].Cycle_ID;
          Outcome.data = [];
          sql =
            "SELECT * FROM MEASURES WHERE Outcome_ID= " +
            Outcome_ID +
            " ORDER BY Measure_Index";

          db.query(sql, (err, result) => {
            if (err) res.send(err);
            else {
              result.forEach(row => {
                measure = {
                  Measure_ID: row.Measure_ID,
                  Measure_Name: row.Measure_label,
                  Measure_Index: row.Measure_Index,
                  Measure_type: row.Measure_type
                };

                Outcome.data.push(measure);
              });

              return res.status(200).json(Outcome);
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/outcome/:outcomeID/measure/create
// @desc    Create a new Rubric Measure
// @access  Private
router.post(
  "/outcome/:outcomeID/measure/create",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const outcomeID = db.escape(req.params.outcomeID);
    let Measure_Name = req.body.Measure_Name;
    let Measure_Type = req.body.Measure_Type;
    const errors = {};

    if (type == "Admin") {
      //console.log(isEmpty(Outcome_Name));
      if (isEmpty(Measure_Name)) {
        errors.Measure_Name = "Measure Name cannot be empty";
        return res.status(404).json(errors);
      }
      Measure_Name = db.escape(Measure_Name);
      let sql =
        "SELECT * FROM MEASURES WHERE Outcome_ID =" +
        outcomeID +
        " AND Measure_label=" +
        Measure_Name;

      // console.log(sql);
      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length > 0) {
            errors.Measure_Name = "Measure Name with that name already exists.";
            return res.status(404).json(errors);
          }

          sql = "SELECT * FROM MEASURES WHERE Outcome_ID =" + outcomeID;
          db.query(sql, (err, result) => {
            if (err) res.send(err);
            else {
              let isSuccess = db.escape("false");
              let isCompleted = db.escape("false");
              let Measure_Index = 0;

              if (result.length != 0) {
                Measure_Index = result[result.length - 1].Measure_Index + 1;
              }

              sql =
                "INSERT INTO MEASURES(Measure_label,isSuccess, Outcome_ID,Measure_Index,Measure_type) VALUES(" +
                Measure_Name +
                "," +
                isSuccess +
                "," +
                outcomeID +
                "," +
                Measure_Index +
                "," +
                db.escape(Measure_Type) +
                ")";
              db.query(sql, (err, result) => {
                if (err)
                  return res
                    .status(400)
                    .json({ error: "There was some problem adding it" });
                else {
                  let Measure_ID = db.escape(result.insertId);

                  //If Measure_Type is rubric, create a rubric measure
                  if (Measure_Type === "rubric") {
                    sql =
                      "INSERT INTO RUBRIC_MEASURES(Measure_ID,Is_Success ) VALUES(" +
                      Measure_ID +
                      "," +
                      isSuccess +
                      ")";

                    db.query(sql, (err, result) => {
                      if (err)
                        return res
                          .status(400)
                          .json({ error: "There was some problem adding it" });
                      else {
                        Rubric_Measure_ID = db.escape(result.insertId);

                        Rubric_Measure = {
                          Measure_ID: Measure_ID,
                          Rubric_Measure_ID: Rubric_Measure_ID
                        };
                        return res.status(200).json(Rubric_Measure);
                      }
                    });
                  } else {
                    //Create a Test Measure
                  }
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

// @route   GET api/cycle/outcome/:outcomeID/measure/:MeasureID
// @desc    get the details of a given measure
// @access  Private route
router.get(
  "/outcome/:outcomeID/measure/:measureID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    let errors = {};
    if (type == "Admin") {
      const Outcome_ID = req.params.outcomeID;
      const Measure_ID = req.params.measureID;
      const Measure = {};

      let sql =
        "SELECT * FROM OUTCOMES NATURAL JOIN MEASURES WHERE Outcome_ID =" +
        Outcome_ID +
        " AND Measure_ID=" +
        Measure_ID;

      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length < 1) {
            errors.Outcome_Name = "Measure not found";
            return res.status(200).json(errors);
          }

          Measure.Measure_ID = Measure_ID;
          Measure.Measure_Label = result[0].Measure_label;
          Measure.Measure_Type = result[0].Measure_type;

          if (Measure.Measure_Type == "rubric") {
            sql =
              " SELECT * FROM RUBRIC_MEASURES WHERE Measure_ID=" + Measure_ID;
            db.query(sql, (err, result) => {
              if (err) return res.status(200).json(err);
              else {
                Rubric_Measure_ID = result[0].Rubric_Measure_ID;
                Measure.Rubric_ID = result[0].Rubric_ID;
                Measure.End_Date = result[0].End_Date;
                Measure.Target = result[0].Target;
                Measure.Threshold = result[0].Threshold;
                Measure.Achieved_Threshold = result[0].Score;
                Measure.Is_Success = result[0].Is_Success;
                Measure.Class_Name = result[0].Class_Name;

                calculateMeasure(Rubric_Measure_ID);

                sql =
                  "SELECT Count(DISTINCT(Student_ID)) AS Total FROM team_bear.RUBRIC NATURAL JOIN RUBRIC_ROW NATURAL JOIN RUBRIC_STUDENTS NATURAL JOIN STUDENTS_RUBRIC_ROWS_GRADE WHERE Rubric_Measure_ID=" +
                  Rubric_Measure_ID;

                db.query(sql, (err, result) => {
                  if (err) throw err;
                  else {
                    const Total_Students = result[0].Total;
                    Measure.Total_Students = Total_Students;

                    //sql to find the count of students with required or better grade
                    sql =
                      "SELECT Count(*) AS Success_Count FROM RUBRIC_STUDENTS WHERE Rubric_Measure_ID=" +
                      Rubric_Measure_ID +
                      " AND Student_Avg_Grade>=" +
                      Measure.Target;

                    db.query(sql, (err, result) => {
                      if (err) throw err;
                      else {
                        Measure.Student_Achieved_Target_Count =
                          result[0].Success_Count;

                        sql =
                          " SELECT Evaluator_Email,CONCAT( Fname, Lname) AS FullName FROM RUBRIC_MEASURES NATURAL JOIN RUBRIC_MEASURE_EVALUATOR EV JOIN Evaluators E on EV.Evaluator_Email = E.Email WHERE Rubric_Measure_ID = " +
                          Rubric_Measure_ID;
                        // console.log(sql);
                        Measure.Evaluators = [];
                        db.query(sql, (err, result) => {
                          if (err) res.status(400).json(err);
                          result.forEach(row => {
                            evaluator = {
                              Evaluator_Email: row.Evaluator_Email,
                              Evaluator_Name: row.FullName
                            };
                            Measure.Evaluators.push(evaluator);
                          });

                          Measure.Students = [];

                          sql =
                            "SELECT Student_ID, Student_Name FROM RUBRIC_STUDENTS NATURAL JOIN RUBRIC_MEASURES WHERE Rubric_Measure_ID= " +
                            Rubric_Measure_ID;

                          Measure.Students = [];

                          db.query(sql, (err, result) => {
                            if (err) res.status(400).json(err);
                            result.forEach(row => {
                              student = {
                                Student_ID: row.Student_ID,
                                Student_Name: row.Student_Name
                              };
                              Measure.Students.push(student);
                            });
                            Measure.Rubric_Name = "";

                            sql =
                              " SELECT Rubric_Name FROM RUBRIC_MEASURES  NATURAL JOIN RUBRIC WHERE Measure_ID=" +
                              Measure_ID;

                            db.query(sql, (err, result) => {
                              if (err) res.status(400).json(err);
                              if (result.length > 0) {
                                Measure.Rubric_Name = result[0].Rubric_Name;
                              }

                              sql =
                                "SELECT DISTINCT S.Student_Name AS Student_Name,CONCAT(EV.Fname,' ',EV.Lname) AS Evaluator_Name FROM ALL_ASSIGNED A LEFT JOIN EVALUATED E ON A.Student_ID = E.Student_ID AND A.Evaluator_Email= E.Evaluator_Email AND A.Rubric_Measure_ID=E.Rubric_Measure_ID JOIN RUBRIC_STUDENTS S ON A.Student_ID=S.Student_ID JOIN Evaluators EV ON EV.Email = A.Evaluator_Email WHERE E.Student_ID IS null AND A.Rubric_Measure_ID=" +
                                Rubric_Measure_ID +
                                " ORDER BY A.Evaluator_Email ASC";

                              db.query(sql, (err, result) => {
                                if (err) res.status(400).json(err);
                                Measure.Unevaluated = [];
                                result.forEach(row => {
                                  let Student_Name = row.Student_Name;
                                  let Evaluator_Name = row.Evaluator_Name;

                                  let isFound = false;

                                  Measure.Unevaluated.forEach(Evaluator => {
                                    if (
                                      Evaluator.Evaluator_Name == Evaluator_Name
                                    ) {
                                      Evaluator.Student_List.push(Student_Name);
                                      isFound = true;
                                    }
                                  });
                                  if (!isFound) {
                                    Evaluator = {
                                      Evaluator_Name: Evaluator_Name,
                                      Student_List: [Student_Name]
                                    };
                                    Measure.Unevaluated.push(Evaluator);
                                  }
                                });
                                res.status(200).json(Measure);
                              });
                            });
                          });
                        });
                      }
                    });
                  }
                });
              }
            });
          } else {
            // for test measure
            res.status(200).json(Measure);
          }
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/outcome/:outcomeID/measure/:MeasureID/edit
// @desc    Create a new Rubric Measure
// @access  Private
router.post(
  "/outcome/:outcomeID/measure/:MeasureID/edit",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const outcomeID = db.escape(req.params.outcomeID);
    let Measure_Name = req.body.Measure_Name;
    const Measure_ID = req.params.MeasureID;
    const errors = {};
    if (type == "Admin") {
      //console.log(isEmpty(Outcome_Name));
      if (isEmpty(Measure_Name)) {
        return res
          .status(404)
          .json((errors.Measure_Name = "Measure Name cannot be empty"));
      }
      Measure_Name = db.escape(Measure_Name);
      let sql =
        "SELECT * FROM MEASURES WHERE Outcome_ID =" +
        outcomeID +
        " AND Measure_ID=" +
        Measure_ID;
      // console.log(sql);
      db.query(sql, (err, result) => {
        if (err) res.send(err);
        else {
          if (result.length < 1) {
            errors.Measure_Name = "Measure does not exist.";
            return res.status(404).json(errors);
          }

          sql =
            "UPDATE MEASURES SET Measure_label=" +
            Measure_Name +
            " WHERE Outcome_ID =" +
            outcomeID +
            " AND Measure_ID=" +
            Measure_ID;

          db.query(sql, (err, result) => {
            if (err) res.send(err);
            else {
              return res
                .status(200)
                .json({ message: "Successfully renamed the Measure." });
            }
          });
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/measures/:measureID/update
// @desc    Update a Rubric Measure details
// @access  Private
router.post(
  "/measure/:measureID/update",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    // const Rubric_Measure_ID = db.escape(req.params.rubricMeasureID);
    const Measure_ID = req.params.measureID;

    const errors = {};
    if (type == "Admin") {
      let sql =
        "SELECT Measure_type FROM MEASURES WHERE Measure_ID = " + Measure_ID;

      db.query(sql, (err, result) => {
        if (err) return res.status(400).json(err);
        else {
          if (result.length < 1) {
            errors.error = "Measure Not found";
            return res.status(404).json(errors);
          }
          //for rubric Measure Type
          if (result[0].Measure_type == "rubric") {
            sql =
              "SELECT * FROM RUBRIC_MEASURES WHERE Measure_ID =" + Measure_ID;

            // console.log(sql);
            db.query(sql, (err, result) => {
              if (err) res.send(err);
              else {
                let Rubric_Measure_ID = result[0].Rubric_Measure_ID;

                //Threshold is %  of total students
                //Target is target score
                //Rubric_ID is the assigned Rubric ID
                //add date later

                const { errors, isValid } = validateUpdateRubric(req.body);

                if (!isValid) {
                  return res.status(404).json(errors);
                }

                Threshold = req.body.Threshold;
                Target = req.body.Target;
                Rubric_ID = req.body.Rubric_ID;
                const Class_Name = db.escape(req.body.Class_Name);

                //leave for date

                sql =
                  "SELECT * FROM RUBRIC WHERE Rubric_ID = " +
                  Rubric_ID +
                  " AND  Dept_ID=" +
                  dept;
                db.query(sql, (err, result) => {
                  if (err) {
                    return res
                      .status(400)
                      .json({ error: "There was some problem adding it" });
                  }

                  if (result.length < 1) {
                    return res.status(400).json({ error: "Rubric Not found." });
                  }

                  sql =
                    "UPDATE RUBRIC_MEASURES SET Threshold=" +
                    Threshold +
                    ", Target =" +
                    Target +
                    ", Rubric_ID=" +
                    Rubric_ID +
                    ", Class_Name=" +
                    Class_Name +
                    " WHERE Rubric_Measure_ID=" +
                    Rubric_Measure_ID;

                  // console.log(sql);

                  db.query(sql, (err, result) => {
                    if (err) {
                      return res
                        .status(400)
                        .json({ error: "There was some problem adding it" });
                    } else {
                      calculateMeasure(Rubric_Measure_ID);
                      return res.status(200).json({
                        message: "Rubric Measure was successfully updated"
                      });
                    }
                  });
                });
              }
            });
          }
          //for Test Measure Type
          else {
          }
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/measures/:measureID/addEvaluator
// @desc    Add an evaluator to a Rubric Measure
// @access  Private
router.post(
  "/measure/:measureID/addEvaluator",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Rubric_Measure_ID = db.escape(req.params.rubricMeasureID);
    const Measure_ID = db.escape(req.params.measureID);
    Evaluator_Email = req.body.Evaluator_Email;

    const errors = {};

    if (type == "Admin") {
      let sql =
        "SELECT Measure_type FROM MEASURES WHERE Measure_ID = " + Measure_ID;

      db.query(sql, (err, result) => {
        if (err) return res.status(400).json(err);
        else {
          if (result.length < 1) {
            errors.error = "Measure Not found";
            return res.status(404).json(errors);
          }
          //for rubric Measure Type
          if (result[0].Measure_type == "rubric") {
            sql =
              "SELECT * FROM RUBRIC_MEASURES WHERE Measure_ID =" + Measure_ID;

            // console.log(sql);
            db.query(sql, (err, result) => {
              if (err) res.send(err);
              else {
                let Rubric_Measure_ID = result[0].Rubric_Measure_ID;

                if (isEmpty(Evaluator_Email)) {
                  errors.Evaluator_Email = "Evaluator email cannot be empty";
                  return res.status(404).json(errors);
                }

                if (!Validator.isEmail(Evaluator_Email)) {
                  errors.Evaluator_Email = "Evaluator email is not valid";
                  return res.status(404).json(errors);
                }
                Evaluator_Email = db.escape(Evaluator_Email);

                //Threshold is %  of total students
                //Target is target score
                //Rubric_ID is the assigned Rubric ID
                //add date later

                sql =
                  "SELECT * FROM Evaluators WHERE Email = " + Evaluator_Email;
                db.query(sql, (err, result) => {
                  if (err) {
                    return res.status(400).json({
                      error: "There was some problem adding the Evaluator"
                    });
                  }

                  if (result.length < 1) {
                    return res
                      .status(400)
                      .json({ error: "Evaluator not found" });
                  }

                  sql =
                    "SELECT * FROM RUBRIC_MEASURE_EVALUATOR WHERE Rubric_Measure_ID=" +
                    Rubric_Measure_ID +
                    " AND Evaluator_Email=" +
                    Evaluator_Email;
                  console.log(sql);
                  db.query(sql, (err, result) => {
                    if (err) {
                      return res.status(400).json({
                        error: "There was some problem adding the Evaluator"
                      });
                    }

                    if (result.length > 0) {
                      return res
                        .status(400)
                        .json({ error: "Evaluator is already assigned" });
                    }
                    sql =
                      "INSERT INTO RUBRIC_MEASURE_EVALUATOR (Rubric_Measure_ID,Evaluator_Email) VALUES(" +
                      Rubric_Measure_ID +
                      "," +
                      Evaluator_Email +
                      ")";

                    db.query(sql, (err, result) => {
                      if (err) {
                        return res.status(400).json({
                          error: "There was some problem adding  the evaluator"
                        });
                      } else {
                        return res.status(200).json({
                          message: "Evaluator has successfully been assigned."
                        });
                      }
                    });
                  });
                });
              }
            });
          } else {
            //for test
          }
        }
      });
    } else {
      res.status(404).json({ error: "Not an Admin" });
    }
  }
);

// @route   POST api/cycle/addStudent
// @desc    Add a student to a Rubric Measure
// @access  Private
router.post(
  "/measure/:measureID/addStudent",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const email = db.escape(req.user.email);
    const type = req.user.type;
    const dept = db.escape(req.user.dept);
    const Rubric_Measure_ID = db.escape(req.params.rubricMeasureID);
    const Measure_ID = db.escape(req.params.measureID);

    const errors = {};
    if (type == "Admin") {
      let sql =
        "SELECT Measure_type FROM MEASURES WHERE Measure_ID = " + Measure_ID;

      db.query(sql, (err, result) => {
        if (err) return res.status(400).json(err);
        else {
          if (result.length < 1) {
            errors.error = "Measure Not found";
            return res.status(404).json(errors);
          }
          //for rubric Measure Type
          if (result[0].Measure_type == "rubric") {
            sql =
              "SELECT * FROM RUBRIC_MEASURES WHERE Measure_ID =" + Measure_ID;

            // console.log(sql);
            db.query(sql, (err, result) => {
              if (err) res.send(err);
              else {
                let Rubric_Measure_ID = result[0].Rubric_Measure_ID;

                Student_ID = req.body.Student_ID;
                Student_Name = req.body.Student_Name;

                if (isEmpty(Student_ID)) {
                  errors.Student_ID = "Evaluatee ID cannot be empty";
                }

                if (isEmpty(Student_Name)) {
                  errors.Student_Name = "Evaluatee Name cannot be empty";
                }

                if (!isEmpty(errors)) {
                  return res.status(404).json(errors);
                }

                Student_ID = db.escape(Student_ID);
                Student_Name = db.escape(Student_Name);

                sql =
                  "SELECT * FROM RUBRIC_STUDENTS WHERE RUBRIC_Measure_ID=" +
                  Rubric_Measure_ID +
                  " AND Student_ID=" +
                  Student_ID;

                db.query(sql, (err, result) => {
                  if (err) {
                    return res.status(400).json({
                      error: "There was some problem adding the Evaluatee"
                    });
                  }

                  if (result.length > 0) {
                    return res
                      .status(400)
                      .json({ error: "Evaluatee is already added" });
                  }
                  sql =
                    "INSERT INTO RUBRIC_STUDENTS (Rubric_Measure_ID, Student_ID, Student_Name, Student_Avg_Grade) VALUES(" +
                    Rubric_Measure_ID +
                    "," +
                    Student_ID +
                    "," +
                    Student_Name +
                    "," +
                    0 +
                    ")";

                  db.query(sql, (err, result) => {
                    if (err) {
                      return res.status(400).json({
                        error: "There was some problem adding  the Evaluatee"
                      });
                    } else {
                      calculateMeasure(Rubric_Measure_ID);
                      return res.status(200).json({
                        message: "Evaluatee has successfully been added"
                      });
                    }
                  });
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
