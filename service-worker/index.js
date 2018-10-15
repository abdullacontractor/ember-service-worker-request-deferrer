import { VERSION } from 'ember-service-worker-request-deferrer/service-worker/config';
import cleanupCaches from 'ember-service-worker/service-worker/cleanup-caches';
import LocalForage from 'ember-service-worker-request-deferrer/service-worker/localforage';

const CACHE_KEY_PREFIX = 'esw-request-deferrer';
const CACHE_NAME = `${CACHE_KEY_PREFIX}-${VERSION}`;

self.addEventListener('fetch', (event) => {
  let request = event.request;
  let isGETRequest = request.method === 'GET';
  let isPOSTRequest = request.method === 'POST';

  if (isPOSTRequest && !navigator.onLine) {
    console.log('No network availability, enqueuing');
    return ENQUEUE(request);
  }

});

self.addEventListener('message', function(msg){
    switch (msg.data.event) {
      case 'online':
        console.log('Network available! Flushing queue.');
        return FLUSH_QUEUE();
        break;
      default:
        console.log("UnkownMessage " + msg.data);
    }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupCaches(CACHE_KEY_PREFIX, CACHE_NAME));
});

/*
 * Removes all cached requests from the cache that aren't in the `CACHE_URLS`
 * list.
 */
const ENQUEUE = (request) => {
  return SERIALIZE(request)
    .then(function(serialized) {
      localforage.getItem('queue')
        .then(function(queue) {
          /* eslint no-param-reassign: 0 */
          queue = queue || [];
          queue.push(serialized);
          return localforage.setItem('queue', queue)
            .then(function() {
              console.log(serialized.method, serialized.url, 'enqueued!');
            });
        });
    });
};

const FLUSH_QUEUE = () => {
  // Get the queue
  return localforage.getItem('queue')
    .then(function(queue) {
      /* eslint no-param-reassign: 0 */
      queue = queue || [];

      // If empty, nothing to do!
      if (!queue.length) {
        return Promise.resolve();
      }

      // Else, send the requests in order...
      console.log('Sending ', queue.length, ' requests...');
      return SEND_IN_ORDER(queue).then(function() {
        // **Requires error handling**. Actually, this is assuming all the requests
        // in queue are a success when reaching the Network. So it should empty the
        // queue step by step, only popping from the queue if the request completes
        // with success.
        return localforage.setItem('queue', []);
      });
    });
};

// Send the requests inside the queue in order. Waiting for the current before
// sending the next one.
const SEND_IN_ORDER = (requests) => {
  // The `reduce()` chains one promise per serialized request, not allowing to
  // progress to the next one until completing the current.
  var sending = requests.reduce(function(prevPromise, serialized) {
    console.log('Sending', serialized.method, serialized.url);
    return prevPromise.then(function() {
      return DESERIALIZE(serialized).then(function(request) {
        return fetch(request).then(function(responseObject) {
           responseObject.body.getReader().read()
           .then((res) => {
              clients.matchAll().then(clients => {
                clients.forEach(client => {
                  send_message_to_client(
                    client,
                    String.fromCharCode.apply(null, res.value)
                  )
                })
              })
            })
        })
      });
    });
  }, Promise.resolve());
  return sending;
}

function send_message_to_client(client, msg){
    return new Promise(function(resolve, reject){
        var msg_chan = new MessageChannel();

        msg_chan.port1.onmessage = function(event){
            if(event.data.error){
                reject(event.data.error);
            }else{
                resolve(event.data);
            }
        };

        client.postMessage(msg, [msg_chan.port2]);
    });
}

// Serialize is a little bit convolved due to headers is not a simple object.
const SERIALIZE = (request) => {
  var headers = {};
  // `for(... of ...)` is ES6 notation but current browsers supporting SW, support this
  // notation as well and this is the only way of retrieving all the headers.
  for (var entry of request.headers.entries()) {
    headers[entry[0]] = entry[1];
  }
  var serialized = {
    url: request.url,
    headers: headers,
    method: request.method,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer
  };

  // Only if method is not `GET` or `HEAD` is the request allowed to have body.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return request.clone().text().then(function(body) {
      serialized.body = body;
      return serialized;
    });
  }
  return serialized;
}

// Compared, deserialize is pretty simple.
const DESERIALIZE = (data) => {
  return Promise.resolve(new Request(data.url, data));
}
