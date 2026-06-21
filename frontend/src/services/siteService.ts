import { BaseService } from './BaseService';

class SiteService extends BaseService<any> {
  constructor() {
    super('/sites');
  }
}

export const siteService = new SiteService();
