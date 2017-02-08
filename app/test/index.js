/**
 * 爬虫测试
 */
var casper = require("casper").create({
	clientScripts: ["jquery.js"],
	waitTimeout: 100000,
	stepTimeout: 100000,
	verbose: true,
	pageSettings: {
	webSecurityEnabled: false
	},
	    onWaitTimeout: function() {
	          this.echo('** Wait-TimeOut **');
	    },
	    onStepTimeout: function() {
	        this.echo('** Step-TimeOut **');
	    }
});

casper.start('https://dianying.nuomi.com/cinema/cinemadetail?uid=5ffb18168672d5466e4760b1', function(response) {
    this.echo(this.getTitle());
    this.echo(this.page.cookies); //undefined
});

casper.then(function getPic() {
  // console.log(this.getHTML());
	var links = this.evaluate(function(){
			var obj = {}
			obj.name = document.getElementById('pageletCinemadetail')
			obj.dd = $(this).find('.title').text()
      return obj.name;  
  });
  console.log(links);
});

casper.run();