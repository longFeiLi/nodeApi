/**
 * 根据电影院影片id 查找 电影院排期
 * by longfei @2017-02-08
 */
const request = require('request');
const cheerio = require('cheerio');
const url = require('url');
const async = require('async');
const dbConfig = require('../../db.json');
const mysql = require('mysql');

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
	console.log(res);
	return new Promise((resolve, reject) => {
		request({
			url: 'http://dianying.taobao.com/cinemaDetailSchedule.htm?showId='+ res.mid + '&cinemaId='+ res.cinemaid+ '&ts=1502421914633&n_s=new',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
			}
		}, function(err, response, body) {
			if (body) {
				let $ = cheerio.load(body);
				let results = [];
				$('.center-wrap .hall-table tr').each(function() {
					var item = {};
					item.cinemaid = res.cinemaid;
					item.mid = res.mid;
					item.showTime = $(this).find('td').eq(0).text().replace(/[\r\n\t]/g, "");
					item.version = $(this).find('td').eq(2).text().replace(/[\r\n\t]/g, "");
					item.language = $(this).find('td').eq(1).text().replace(/[\r\n\t]/g, "");
					item.price = $(this).find('td').eq(4).find('.now').text().replace(/[\r\n\t]/g, "");
					item.data = new Date();
					results.push(item);
				});
				if(results.length > 0){
					insertScreenings(results);
				}
				resolve()
			}
		});
	});

}


/**
 * 连接数据库查询url 抓取 影片排期
 * http://dianying.taobao.com/cinemaDetail.htm?cinemaId=4637&n_s=new#seat
 */
function setScreeningsList() {
	handleError();
	console.log('开始执行抓取影片排期');
	console.time('series');
	async.waterfall([
		function(callback) {
			//打开数据库查询数据
			conn.query('select c.mid,c.cinemaid from cine c',
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
			Promise.resolve(getScreeningsList(results)).then(function(msg){
			  callback(null, msg);
			});
		}
	], function(err, results) {
		console.log('执行抓取电影影片排期结束');
	});
}


/**
 * [getCineList 获取数据]
 * @return {[type]} [description]
 */
async function getScreeningsList(results) {
	for (let i = 0; i < results.length; i++) {
		await Promise.resolve(cineList(results[i]));
	};
	return new Promise((resolve, reject) => {
		resolve('ok');
	});
}


/**
 * [insertCine 插入cine表数据 ]
 * @return {[type]} [description]
 */
function insertScreenings(oResult) {
	console.log(oResult);
	for (var i = 1; i < oResult.length; i++) {
		conn.query('INSERT INTO screenings SET ?', oResult[i], function(err) {
			if (err) {
				return conn.rollback(function() {
					throw err;
				});
			}
		});
		// conn.end();
	}
}




exports.setScreeningsList = setScreeningsList;

