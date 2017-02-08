/**
 * 抓取淘宝电影数据
 * http://dianying.taobao.com/cinemaList.htm?spm=a1z21.6646273.header.5.tR6MQg&n_s=new
 * by longfei
 */
const request = require('request');
const cheerio = require('cheerio');
const url = require('url');
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
 * [crawlCine 抓取电影院名字]
 * @param  {[type]} i [页数]
 * http://dianying.taobao.com/ajaxCinemaList.htm?page=2&regionName=&cinemaName=&pageSize=10&pageLength=21&sortType=0&n_s=new
 * @return {[type]}       [description]
 */
const crawlCine = function(i) {
	return new Promise((resolve, reject) => {
		request({
			url: 'http://dianying.taobao.com/ajaxCinemaList.htm?page='+ i +'&regionName=&cinemaName=&pageSize=10&pageLength=21&sortType=0&n_s=new',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
			}
		}, function(err, response, body) {
			if (body) {
				// console.log(body);
				let $ = cheerio.load(body);
				let results = [];
				$('li').each(function(){
					let item = {};
					item.name = $(this).find('.middle-hd a').text();
					item.address = $(this).find('.limit-address').text();
					item.tel = $(this).find('.middle-p .middle-p-list').eq(1).text().substr(3);
					let cineurl = $(this).find('.right-buy a').attr("href");
					item.cineurl = cineurl;
					item.mid = url.parse(cineurl,true).query.cinemaId;
					item.date = new Date();
					results.push(item);
				})
				insertTable('cinema', results);
				resolve()
			}
		});
	})
}

/**
 * 抓取网址 ：http://dianying.taobao.com/cinemaList.htm?spm=a1z21.6646273.header.5.tR6MQg&n_s=new
 * 21 页
 */
async function getCinemaList() {
	handleError();
	console.log('开始执行抓取电影院列表');
	// 知道有21页
	let cineMax = 22; // 总页数
	for (let i = 1; i < cineMax; i++) {
		await Promise.resolve(crawlCine(i));
	};
	console.log('执行抓取电影院列表结束');
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

getCinemaList()