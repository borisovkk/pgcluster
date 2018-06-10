const SQL_ACTIVITY_STAT = 'select * from pg_stat_activity;';
const SQL_REPL_NODES = 'select * from nodes;';
const SQL_SHOW_POOL_NODES = 'show pool_nodes;';

const getStatActivity = () => {
  let pool = require('../config/pgppool.js');
  let q = new Promise((resolve, reject) => {
    pool.query(SQL_ACTIVITY_STAT, [], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
  return q;
};

const getReplNodesFromDB = async db => {
  return new Promise((resolve, reject) => {
    db.query(SQL_REPL_NODES, [], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

const getReplNodes = async () => {
  let pgpool = require('../config/pgppool').pool;
  try {
    let result = await getReplNodesFromDB(pgpool);
    return Promise.resolve(result);
  } catch (e) {
    return Promise.reject('Cannot connect to pgpool');
    /*
    let pools = require("../config/pgpool").pools;
    let result;
    for (var i = 0; i < pools.length && ! result; i++) {
      try {
        result = await getReplNodesFromDB(pools[i].pool);
        return Promise.resolve(result);
      } catch (e) {
        console.log(`cannot connect to ${pools[i].host}`);
      }
    }
    */
  }
};

/*
const getReplNodes = () => {
	let pgpool = require('../config/pgppool').pool;
	let q = new Promise((resolve,reject)=>{
		pgpool.connect().
			then((client)=>{
				client.query(SQL_REPL_NODES)
					.then((res)=>{
						client.release();
					  resolve(res);
					})
					.catch((err)=>{
						client.release();
						reject(err);
					})
			})
			.catch((err)=>{
				console.log('pool connect error', err);
				reject(err);
			})
	});
	return q;
}
*/
const getPoolNodes = () => {
  let pgppool = require('../config/pgppool').pool;
  let q = new Promise((resolve, reject) => {
    pgppool
      .connect()
      .then(client => {
        client
          .query(SQL_SHOW_POOL_NODES)
          .then(res => {
            client.release();
            resolve(res);
          })
          .catch(err => {
            client.release();
            reject(err);
          });
      })
      .catch(err => {
        console.log('pool connect error', err);
        reject(err);
      });
  });
  return q;
};

const dbStates = () => {
  let pools = require('../config/pgpool').pools;

  let pool = require('../config/pgpool');
  let states = [];
  return new Promise((resolve, reject) => {
    pools.forEach((el, idx) => {
      let state = { idx: idx, host: el.host };
      pool.query(
        idx,
        'select pg_is_in_recovery() as in_recovery',
        [],
        (err, result) => {
          if (err) {
            console.log(err);
            state.status = 'red';
          } else {
            state.status = 'green';
            state.in_recovery = result.rows[0].in_recovery;
          }
          states.push(state);
          if (states.length === pools.length) {
            return resolve(states);
          }
        }
      );
    });
  });
};

const replicationStats = () => {
  let pools = require('../config/pgpool').pools;

  let pool = require('../config/pgpool');
  let states = [];
  return new Promise((resolve, reject) => {
    pools.forEach((el, idx) => {
      let res;
      pool.query(
        idx,
        'select pg_is_in_recovery() as in_recovery',
        [],
        (err, result) => {
          if (err) {
            states.push({ idx: idx, host: el.host, status: 'red' });
            if (states.length === pools.length) {
              return resolve(states);
            }
          } else {
            let in_recovery = result.rows[0].in_recovery;
            let SQL = `select * from ${
              in_recovery ? 'pg_stat_wal_receiver' : 'pg_stat_replication'
            }`;
            console.log(SQL);
            pool.query(idx, SQL, [], (err, result) => {
              if (err) {
                console.log('error in ' + SQL);
                console.log(err);
                states.push({
                  idx: idx,
                  host: el.host,
                  status: 'green',
                  in_recovery: in_recovery,
                  error: err
                });
              } else {
                states.push({
                  idx: idx,
                  host: el.host,
                  status: 'green',
                  in_recovery: in_recovery,
                  data: result.rows[0]
                });
              }
              if (states.length === pools.length) {
                return resolve(states);
              }
            });
          }
        }
      );
    });
  });
};

module.exports = {
  getStatActivity: getStatActivity,
  getReplNodes: getReplNodes,
  getPoolNodes: getPoolNodes,
  dbStates: dbStates,
  replicationStats: replicationStats
};
