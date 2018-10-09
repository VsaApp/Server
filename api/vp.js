const request = require('request');
const parser = require('fast-html-parser');
const fs = require('fs');
const path = require('path');

let config = {};

let lastToday = '';
let lastTomorrow = '';
let vpToday = {};
let vpTomorrow = {};

this.getVP = (today, callback) => {
	return new Promise(resolve => {
		request('http://www.viktoriaschule-aachen.de/sundvplan/vps/' + (today ? 'left' : 'right') + '.html', (error, response, body) => {
				if (!response) {
					this.getVP(today, callback);
					return;
				}
				if (response.statusCode !== 200) {
					console.error(body);
					process.exit(1);
				}
				const html = parser.parse(body);
				const dateStr = html.querySelectorAll('div')[0].childNodes[0].rawText.substr(1).replace('-Klassen-Vertretungsplan für ', '').replace('Januar', 'January').replace('Februar', 'February').replace('März', 'March').replace('Mai', 'May').replace('Juni', 'June').replace('Juli', 'July').replace('Oktober', 'October').replace('Dezember', 'December');
				const time = html.querySelectorAll('div')[1].childNodes[0].rawText.replace('Viktoriaschule Aachen, den ', '').split(' um ')[1];
			const changeDate = html.querySelectorAll('div')[1].childNodes[0].rawText.replace('Viktoriaschule Aachen, den ', '').split(' um ')[0];
				const date = new Date(dateStr);
				date.setHours(date.getHours() + 1);
				const weekday = dateStr.split(', ')[0];
				let update = false;
				if (today && lastToday !== dateStr + time) {
					update = true;
				}
				if (!today && lastTomorrow !== dateStr + time) {
					update = true;
				}
				if (update) {
					if (today) {
						lastToday = dateStr + time;
					} else {
						lastTomorrow = dateStr + time;
					}
					['5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c', '8a', '8b', '8c', '9a', '9b', '9c', 'EF', 'Q1', 'Q2', '13'].forEach(grade => {
						vpToday[grade] = {
							date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
							time: time,
							update: changeDate,
							weekday: weekday,
							changes: []
						};
						vpTomorrow[grade] = {
							date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
							time: time,
							update: changeDate,
							weekday: weekday,
							changes: []
						};
					});
					try {
						const table = html.querySelectorAll('table')[0];
						let prevGrade = '';
						// Read the vp...
						for (let i = 1; i < table.childNodes.length; i++) {
							let data = {
								grade: '',
								unit: 0,
								lesson: '',
								type: '',
								room: '',
								teacher: '',
								changed: {
									info: '',
									teacher: '',
									room: ''
								}
							};
							let prevText = '';
							for (let j = 0; j < table.childNodes[i].childNodes.length; j++) {
								let text = '';
								for (let k = 0; k < table.childNodes[i].childNodes[j].childNodes.length; k++) {
									text += table.childNodes[i].childNodes[j].childNodes[k].childNodes[0].rawText + '\n';
								}
								text = text.slice(0, -1);
								text = text.replace('*** ', '');
								if (text.length === 1) {
									text = '';
								}
								text = text.trim();
								if (j === 0) {
									if (text.startsWith('···')) {
										data.grade = prevGrade;
									} else {
										data.grade = text.split(' ')[0].slice(0, -1);
										prevGrade = data.grade;
									}
									data.unit = parseInt(text.split(' ')[1].slice(0, -1));
								} else if (j === 1) {
									text = text.replace(/\n/g, ' ').replace('(', '').replace(')', '');
									while (text.includes('  ')) {
										text = text.replace('  ', ' ');
									}
									prevText = text;
									if ((text.match(/ /g) || []).length === 1) {
										data.lesson = text.split(' ')[0].toUpperCase();
										data.room = text.split(' ')[1].toUpperCase();
									} else if (text.includes('Klausur')) {
										if (!text.includes('Nachschreiber')) {
											let room = text.split(' ')[text.split(' ').length - 1];
											let teacher = text.split(':')[1].split(' ').slice(-1)[0];
											text = text.split(':')[1].trim().split(' ');
											text.splice(-1, 1);
											text = text.join(' ');
											let textArr = text.split(' ');
											for (let k = 0; k < textArr.length / 4; k++) {
												let a = '';
												for (let l = 0; l < 4; l++) {
													a += textArr[k * 4 + l] + ' ';
												}
												a = a.trim();
												let d = {
													grade: data.grade,
													unit: data.unit,
													lesson: a.split(' ')[2],
													type: a.split(' ')[3],
													room: '',
													teacher: a.split(' ')[1],
													changed: {
														info: 'Klausur',
														teacher: teacher,
														room: room
													}
												};
												if (k !== textArr.length / 4 - 1) {
													if (today) {
														vpToday[d.grade].changes.push(d);
													} else {
														vpTomorrow[d.grade].changes.push(d);
													}
												} else {
													data = d;
												}
											}
										}
									} else {
										data.lesson = text.split(' ')[1].toUpperCase();
										data.type = text.split(' ')[2].toUpperCase();
										data.room = text.split(' ')[3].toUpperCase();
									}
								} else {
									text = text.replace('\n', ' ');
									let parsed = false;
									while (text.includes('  ')) {
										text = text.replace('  ', ' ');
									}
									if (text.toLowerCase().includes('r-ändg.')) {
										data.changed.info += 'Raumänderung ';
										data.changed.room += text.split(' ')[text.split(' ').length - 1].toUpperCase();
										parsed = true;
									}
									if (text.toLowerCase() === 'referendar(in)') {
										data.changed.info += 'Referendar(in) ';
										parsed = true;
									}
									if (text.toLowerCase().includes('m.aufg.')) {
										data.changed.info += 'Mit Aufgaben ';
										data.changed.teacher = text.split(' ')[0];
										data.changed.room = text.split(' ')[text.split(' ').length - 1].toUpperCase();
										parsed = true;
									}
									if (text.toLowerCase() === 'abgehängt' || text.toLowerCase() === 'abghgt.' || text.toLowerCase() === 'u-frei' || text.toLowerCase() === 'studienzeit') {
										data.changed.info = 'Freistunde ';
										parsed = true;
									}
									if (text.toLowerCase().includes('v.')) {
										data.changed.info += 'Vertretung ';
										parsed = true;
									}
									if (text.toLowerCase().includes('versch.')) {
										data.changed.info += 'Verschoben ';
										parsed = true;
									}
									if (!parsed) {
										if (text !== '') {
											data.changed.info = text;
										} else {
											if (prevText.toLowerCase().includes('klausur')) {
												if (prevText.toLowerCase().includes('nachschreiber')) {
													data.changed.info = 'Klausur Nachschreiber';
													data.changed.teacher = prevText.toLowerCase().split('nachschreiber')[1].split(':')[0].trim().toUpperCase();
													data.changed.room = prevText.split(' ')[prevText.split(' ').length - 1];
												}
											} else {
												data.changed.info = 'Freistunde';
											}
										}
									}
									data.changed.info = data.changed.info.trim();
								}
							}
							data.changed.room = data.changed.room
								.replace(/KLHA|KLH/, 'kleine Halle')
								.replace(/GRHA|GRH/, 'große Halle')
								.replace('KU1', 'Kunst 1')
								.replace('KU2', 'Kunst 2');
							data.room = data.room
								.replace(/KLHA|KLH/, 'kleine Halle')
								.replace(/GRHA|GRH/, 'große Halle')
								.replace('KU1', 'Kunst 1')
								.replace('KU2', 'Kunst 2');
							if (today) {
								vpToday[data.grade].changes.push(data);
							} else {
								vpTomorrow[data.grade].changes.push(data);
							}
						}
					} catch
						(e) {
						console.log(e);
					}

					if (today) {
						Object.keys(vpToday).forEach(grade => {
							vpToday[grade].changes = vpToday[grade].changes.filter(el => {
								return !/^[A-Z]$/m.test(el.room);
							});
						});
						Object.keys(vpToday).forEach(key => callback(key, vpToday[key]));
						resolve(Object.keys(vpToday).map(key => ({grade: key, vp: vpToday[key]})));
					} else {
						Object.keys(vpTomorrow).forEach(grade => {
							vpTomorrow[grade].changes = vpTomorrow[grade].changes.filter(el => {
								return !/^[A-Z]$/m.test(el.room);
							});
						});
						Object.keys(vpTomorrow).forEach(key => callback(key, vpTomorrow[key]));
						resolve(Object.keys(vpTomorrow).map(key => ({grade: key, vp: vpTomorrow[key]})));
					}
					console.log('Downloaded vp of ' + (today ? 'today' : 'tomorrow'));
				}
			}
		).auth(config.username, config.password, false);
	});
};

this.setConfig = c => {
	config = c;
};

module.exports = this;