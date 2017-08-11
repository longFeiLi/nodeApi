/**
 * 根据url查询下面所有电影场次
 * by longfei @2017-02-08
 */
const request = require('request');
const cheerio = require('cheerio');
const url = require('url');
const async = require('async');
const dbConfig = require('../../db.json');
const mysql = require('mysql');

const tScreenings = require('./screenings');

let conn = mysql.createConnection(dbConfig);

/**
 * [handleError 连接数据库自带重连]
 * @return {[type]} [description]
 */
function handleError() {
	conn = mysql.createConnection(dbConfig);
	//连接错误，2秒重试
	conn.connect(function(err) {
		if (err) {
			console.log('error when connecting to db:', err);
			setTimeout(handleError, 2000);
		}
	});

	conn.on('error', function(err) {
		console.log('db error', err);
		// 如果是连接断开，自动重新连接
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			handleError();
		} else {
			throw err;
		}
	});
}


/**
 * 获取最近电影场次
 */
const cineList = function(res) {
	return new Promise((resolve, reject) => {
		request({
			url: 'http://dianying.taobao.com/cinemaDetailSchedule.htm?showId=&cinemaId=36902&ts=1486537875527&n_s=new',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
			}
		}, function(err, response, body) {
			if (body) {
				let $ = cheerio.load(body);
				// console.log(body);
				let results = [];
				// console.log($('.filter-select .select-tags .current').attr('href'));
				$('.filter-select .select-tags').eq(0).find('a').each(function() {
						let item = {};
						item.mid = url.parse('www.lovell.com/s?' + $(this).attr('data-param'), true).query.showId;
						item.name = $(this).text();
						item.cinemaid = res.mid;
						item.date = new Date();
						results.push(item);
					})
					insertTable('cine', results);
					resolve()
			}
		});
	});

}

/**
 * [insertCine 插入cine表数据 ]
 * @return {[type]} [description]
 */
function insertTable(table, oResult) {
	// console.log(oResult);
	for (var i = 0; i < oResult.length; i++) {
		conn.query('INSERT INTO ' + table + ' SET ?', oResult[i], function(err) {
			if (err) {
				return conn.rollback(function() {
					throw err;
				});
			}
		})
	}
}


/**
 * 连接数据库查询url 抓取
 * http://dianying.taobao.com/cinemaDetail.htm?cinemaId=4637&n_s=new#seat
 */
function setCineList() {
	handleError();
	console.log('开始执行抓取电影列表');
	async.waterfall([
		function(callback) {
			//打开数据库查询数据
			conn.query('select c.mid, c.cineurl from cinema c ',
				function(err, results, fields) {
					if (!err) {
						// 返回结果
						callback(null, results);
					} else {
						throw err;
					}
				});
		},
		function(results, callback) {
			Promise.resolve(getCineList(results)).then(function(msg){
			  callback(null, msg);
			});
		}
	], function(err, results) {
		console.log('执行抓取电影列表结束');
		tScreenings.setScreeningsList();
	  console.timeEnd('series');
	});
}

/**
 * [getCineList 获取数据]
 * @return {[type]} [description]
 */
async function getCineList(results) {
	console.log(results);
	for (let i = 0; i < results.length; i++) {
		await Promise.resolve(cineList(results[i]));
	};
	return new Promise((resolve, reject) => {
		resolve('ok');
	});
}

exports.setCineList = setCineList;
