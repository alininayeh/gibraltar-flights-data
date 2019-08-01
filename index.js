const http = require('http');
const request = require('request');
const cheerio = require('cheerio');
const URL = 'http://www.gibraltarairport.gi/content/live-flight-info';
const PORT = process.env.PORT || 8888;
const CACHE_TIME_IN_SECONDS = 60;

const Api = {
  $: null,

  cachedTime: 0,

  needsRefresh() {
    return (new Date().getTime() - this.cachedTime) > (CACHE_TIME_IN_SECONDS * 1000);
  },

  getContent() {
    return new Promise((resolve, reject) => {
      if (!this.needsRefresh()) {
        resolve(this.$);
      } else {
        request(URL, (error, response, body) => {
          if (error) {
            reject();
          } else {
            this.$ = cheerio.load(body);
            this.cachedTime = new Date().getTime();
            resolve(this.$);
          }
        });
      }
    });
  },

  getData(type) {
    const data = {};
    const $tables = this.$('.tab-' + type + ' .flight-info-tables');
    let items = [];
    
    $tables.each((i, table) => {
      const date = this.$(table).find('h2').text();
  
      if(!data[date]) {
        items = [];
  
        this.$(table).find('tr').each((j, tr) => {
          const $tds = this.$(tr).find('td');
  
          if($tds.length) {
            items.push({
              time: $tds.eq(0).text(),
              place: $tds.eq(3).text(),
              status: $tds.eq(4).text()
            });
          }
        });
  
        data[date] = items;
      }
    });
  
    return data;
  },

  start() {
    http.createServer(async (req, res) => {
      if(req.url.indexOf('favicon') != -1) {
        res.end();
        return;
      } else {
        await this.getContent();
        res.setHeader('content-type', 'text/json');
    
        res.end(JSON.stringify({
          arrivals: this.getData('arrivals'),
          departures: this.getData('departures')
        }));
      }
    }).listen(PORT);
  }
};

Api.start();