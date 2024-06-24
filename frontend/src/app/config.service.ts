import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  base_url = environment.url;
  sandboxPaypalSecret = environment.paypalSecret;

  constructor(private http: HttpClient) { }

  getTestData() {      
    return this.http.get('https://reqres.in/api/users')
  }
  
  locationByZipCode( data ) {
    return this.http.post( this.base_url + '/getlocation', data)
  }

  generateHtmlToImage(data, template = 'a', file = '') {
    return this.http.post( this.base_url + '/generate/paystub?template=' + template + '&file=' + file, data)
  }

  generateW2HtmlToImage(data, template = 'a', file = '') {
    return this.http.post( this.base_url + '/generate/w2?template=' + template + '&file=' + file, data)
  }

  downloadPaystub(template) {
    return this.http.post( this.base_url + '/download/paystub', {'template': template})
  }
}
