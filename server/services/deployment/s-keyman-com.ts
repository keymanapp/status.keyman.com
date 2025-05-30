/*
 Service to collect version info from s.keyman.com
*/

import httpget from "../../util/httpget.js";
import DataService from "../data-service.js";

const HOST='s.keyman.com';
const PATH='/api/kmwversion.php';

/*let debug_count = 275;
let debug = (data) => {
   data.versions.push('14.0.'+debug_count);
   data.versions.sort();
   debug_count++;
   console.log(data);
   return data;
};*/

const service: DataService = {
   get: () => httpget(HOST, PATH).then((data) => /*debug(*/JSON.parse(data.data)/*)*/),
};

export default service;
