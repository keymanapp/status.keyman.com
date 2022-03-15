/*
 Service to collect version info from Debian
*/

import httpget from "../../util/httpget";
import DataService from "../data-service";

// https://sources.debian.org/api/src/keyman-config/
const HOST = 'sources.debian.org';
const PATH_PREFIX = '/api/src/';

const service = {
	get: function (tier: string, suite: string) {
		switch (tier) {
			case 'alpha':
			// case 'beta':
				return null;
			default:
				{
					const component: string = tier == 'stable' ? 'keyman-config/' : 'keyman-config/';
					return httpget(HOST, PATH_PREFIX + component).then((data) => {
						const results = JSON.parse(data.data);
						if (results && typeof results.versions == 'object' && results.versions.length > 0) {
							for (let i = 0; i < results.versions.length; i++) {
								const pkgVersion = results.versions[i];
								if (typeof pkgVersion.suites == 'object' && pkgVersion.suites.includes(suite)) {
									return { version: pkgVersion.version.split('-')[0] };
								}
							}
						}
						return null;
					});
				}
		}
	}
};

class ServiceClass implements DataService {
	constructor(private readonly tier: string, private readonly suite: string) {
	}

	get = () => service.get(this.tier, this.suite);
}

// We don't publish alpha packages to Debian
export const debianBetaService: DataService = new ServiceClass('beta', 'sid');
export const debianStableService: DataService = new ServiceClass('stable', 'sid');
