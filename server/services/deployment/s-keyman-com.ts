/*
 Service to collect version info from s.keyman.com
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

const HOST='s-keyman-com.azurewebsites.net';
const PATH='/api/kmwversion.php';

const service: DataService = {
   get: () => httpget(HOST, PATH).then((data) => JSON.parse(data.data))
};

export default service;
