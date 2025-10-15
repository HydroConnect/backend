import express from "express";
// require("dotenv").config({ path: "./.d.env" });
// const mongoose = require("mongoose");
// const express = require("express");
var app = express();
app.get("/", function (req, res) {
    res.send("Halo!\n");
});
app.listen(process.env.PORT || 3000, function () {
    console.log("Server Running!");
});
