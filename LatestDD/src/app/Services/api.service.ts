import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor() {}
  http = inject(HttpClient);

  GetTableApi(payload: any) {
    return this.http.post('http://192.168.1.76:5300/api/Database/tables', payload);
  }
  GetColumnApi(selectedTable: string){
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post("http://192.168.1.76:5300/api/Database/fields",JSON.stringify(selectedTable),{headers});
  }

  GetData(selectedTable: string) {
    const payload = {tableName: selectedTable}
    return this.http.post(`http://192.168.1.76:5400/api/Database/table-data`,payload);
  }
}
