'use strict';

let express = require('express');
//显示请求信息
var logger = require('morgan');
var bodyParser = require("body-parser");
var cors = require('cors');

//引入文件
let taobaoCine = require('./app/taobao/cine');




let app = express();
var http = require('http').createServer(app);
let mysql = require('mysql');
let dbConfig = require('./db.json');

//定义抓数据  later
let later = require('later');
later.date.localTime();

//am  pm
var sched = later.parse.text('at 9:00 am every'),
  t = later.setTimeout(function() {
    test();
  }, sched);

// test();
/*
 *每个小时5分钟定义去查询当前电影票价格
 *
 */
async function test() {
  console.log(new Date());
  console.log('我是每天9点来一遍哦');
  //把数据删掉
  //写方法
  delcine();
  await getCine();
}


app.set('port', 3001);
app.use(logger('dev'));
// app.enable('trust proxy');
app.use(bodyParser.urlencoded({
  extended: false
}));

// app.use(cookieParser);
http.listen(3001, function() {
  console.log('监听端口：3001');
});


var conn;
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
 * 根据地址获取电影院名字
 */
async function getCine() {
  // 获取数据
  await taobaoCine.setCineList();
}

/**
 * 删除电影院列表 和 场次
 * 
 */
function delcine(){
    handleError();
    conn.query('DELETE FROM cine', function (err, result) {
      if (err) throw err;

      console.log('deleted ' + result.affectedRows + ' rows');
    });
    conn.query('DELETE FROM screenings', function (err, result) {
      if (err) throw err;
      console.log('deleted ' + result.affectedRows + ' rows');
    });
}

app.use(cors({
    origin:['http://www.lovell.com.cn','http://localhost:3000'],
    methods:['GET','POST'],
    alloweHeaders:['Conten-Type', 'Authorization']
}));


app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/x-www-form-urlencoded");
    next();
});



//获取电影院场次
app.post('/api/getScreeningList', function(req, res) {
  // dbcineQuery.getCineList
  handleError();
  let sql ='SELECT DISTINCT s.*, c.name AS name FROM screenings s, cine c WHERE c.cinemaid = s.cinemaid AND c.mid = s.mid and c.name = ? ';
  conn.query(sql, req.body.name,
    function(err, results, fields) {
      if (!err) {
        //处理数据
        return res.send({
          'code': 0,
          'data': results
        });
      } else {
        throw err;
      }
    });

});

/**
 * [查询所有电影院]
 * @param  {[type]} req  [description]
 * @param  {[type]}
 * @return {[type]}      [description]
 */
app.post('/api/getCineMaList', function(req, res) {
  // dbcineQuery.getCineList
  handleError();
  conn.query('select  c.mid,c.address,c.`name`,c.tel  from cinema c',
    function(err, results, fields) {
      if (!err) {
        return res.send({
          'code': 0,
          'data': results
        });
      } else {
        throw err;
      }
    });
});

/**
 * [通过电影院id 获取电影院电影场次]
 * @param  {[type]} req    [description]
 * @param  {[type]} res){ } [description]
 * @return {[type]}        [description]
 */
app.post('/api/getMovieSiteByid', function(req, res) {
  handleError();
  let sql = 'SELECT distinct c.`name`,count(c.`name`) as value FROM cine c, screenings s WHERE c.cinemaid = ? AND s.cinemaid = c.cinemaid AND s.mid = c.mid group by c.`name` ORDER BY count(c.`name`) ';
  conn.query(sql, req.body.mid,
    function(err, results, fields) {
      if (!err) {
        return res.send({
          'code': 0,
          'data': results
        });
      } else {
        return res.send({
          'code': 0,
          'data': {}
        });
      }
    });
});

/**
 * [通过电影 名字 获取电影院电影场次]
 * @param  {[type]} req    [description]
 * @param  {[type]} res){ } [description]
 * @return {[type]}        [description]
 */
app.post('/api/getMovieByName', function(req, res) {
  handleError();
  let sql = "SELECT c.`name`, s.showtime, s.price FROM cine c, screenings s WHERE s.mid = c.mid AND c.NAME LIKE ? ";
  conn.query(sql, '%' + req.body.name + '%',
    function(err, results, fields) {
      if (!err) {
        return res.send({
          'code': 0,
          'data': results
        });
      } else {
        return res.send({
          'code': 0,
          'data': {},
          'err' : err
        });
      }
    });
});

/**
 * [获取电影院电影列表]
 * @param  {[type]} req    [description]
 * @param  {[type]} res){ } [description]
 * @return {[type]}        [description]
 */
app.post('/api/getMovieList', function(req, res) {
  handleError();
  let sql = "SELECT distinct c.`name`, c.mid FROM cine c, screenings s WHERE s.mid = c.mid";
  conn.query(sql,
    function(err, results, fields) {
      if (!err) {
        return res.send({
          'code': 0,
          'data': results
        });
      } else {
        return res.send({
          'code': 0,
          'data': {},
          'err' : err
        });
      }
    });
});


// app.post('')
