#!/usr/bin/env node

// Définition des dépendances
const db = require('sqlite')
const program = require('commander');
const inquirer = require('inquirer');
const imdb = require('imdb-api');
const Promise = require('bluebird')
const fs = require('fs')

// Crée la BDD
function createTable()
{
	db.open('YMDB.db').then(() => {
		db.run('CREATE TABLE IF NOT EXISTS Films (title TEXT PRIMARY KEY, year INTEGER, genres TEXT, rated INTEGER, plot TEXT, watched TEXT, rating INTEGER)')
	}).catch((err) => { // Si on a eu des erreurs
		console.error('ERR > ', err)
	})
}

// Insert les infos liées au movie dans la BDD
function insertInDatabase(movie, watched)
{
	db.open('YMDB.db').then(() => {
		db.all('SELECT * FROM Films WHERE title=?', movie.title).then((response) => {
			if(response.title != "")
			{
				console.log('titre : ' + movie.title)
				console.log('date de parution : ' + movie.year)
				console.log('genre : ' + movie.genres)
				console.log('PEGI movie : ' + movie.rated)
				console.log('resume : ' + movie.plot)
				console.log('note : ' + movie.rating)
				db.run('INSERT INTO Films VALUES(?,?,?,?,?,?,?)', movie.title, movie.year, movie.genres, movie.rated, movie.plot, watched, movie.rating).catch((err) => {
					console.error('Votre film etait deja enregistré')
				})
			}
		})
	})
}

// Passe une requete a l'API et renvoie toute les data liées à celui-ci
function GetMovieData(movietitle){
	return new Promise((resolve, reject)=>{
		imdb.getReq({ name: movietitle }, function(err, movie){
			resolve(movie)
		})
	})
}

// Demande à l'user si il a vue le film et renvoie une variable contenant oui ou non
function didyouwatch(){
	return new Promise((resolve, reject)=>{
		inquirer.prompt([
			{
				type:'input',
				message : 'Avez vous deja vue le film ? (repondez par \'oui\' ou \'non\')',
				name : 'watched'
			}
		]).then((answers)=>{
			if (answers.watched == 'oui'){
				resolve(answers.watched)
			}
			else if(answers.watched == 'non'){
				resolve(answers.watched)
			}
			else{
				didyouwatch()
			}
		})
	})
}

// Affiche à l'user les film vue ou non vue en fonction de watched
function showMovie(watched){
	db.open('YMDB.db').then(() => {
		db.all('SELECT title FROM Films WHERE watched=?', watched).then((response) => {
			response.forEach(function(index) {
				console.log(index.title)
			})
		})
	})
}

function exportDatabase(){
	fs.stat('exportDB.txt', function(err, stat) {
		if (err == null) {
			fs.unlink('exportDB.txt')
		}
	})
	db.open('YMDB.db').then(() => {
		db.all('SELECT title FROM Films').then((response) => {
			response.forEach(function(index) {
				fs.appendFile('exportDB.txt',index.title + "\n", (err) =>{
					if (err) throw err
				})
			})
			console.log('fichier exporté')
		})
	})
}

// Start classique sans options
function start(){
	createTable()
	inquirer.prompt([
		{
			type:'input',
			message : 'Etrez le film sur lequel vous voulez des informations',
			name : 'movietitle'
		}
	]).then((answers)=>{
		GetMovieData(answers.movietitle).then((response)=>{
			if (response == undefined){
				console.log('votre film n\'existe pas en BDD IMDB, le titre doit etre celui en anglais')
				start()
			}
			else{
				didyouwatch().then((responsewatched)=>{
					insertInDatabase(response, responsewatched)
				})

			}


		})
	})
}


program
.version('1.0.0')
.option('-w, --watched', 'Show watched movie')
.option('-u, --unwatched', 'show unwatched movie')
.option('-e, --export', 'export data in file')

program.parse(process.argv)
if (program.watched){
	showMovie('oui')
} else if (program.unwatched){
	showMovie('non')
}else if (program.export){
	exportDatabase()
}else{
	start()
}
