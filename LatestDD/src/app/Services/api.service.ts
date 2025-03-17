import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
 
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor() {}
  http = inject(HttpClient);
 
  GetTableApi(payload: any) {
    return this.http.post('http://192.168.1.30:5151/api/dashboard/tables', payload);
  }
  GetColumnApi(selectedTable: string){
    // console.log(selectedTable.toString());
    // const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const payload = {tableName:selectedTable}
    return this.http.post("http://192.168.1.76:5400/api/Database/columns",payload);
    //http://192.168.1.30:5151/api/dashboard/fields
    //http://192.168.1.76:5400/api/Database/columns
  }
 
  GetData(selectedTable: string) {
    const payload = {tableName: selectedTable}
    return this.http.post(`http://192.168.1.30:5151/api/dashboard/dynamic-query`,payload);
    // http://192.168.1.30:5151/api/dashboard/dynamic-query
    //http://192.168.1.76:5400/api/Database/table-data
  }
 
  GetJoinTableData(joinDetails: any){
    return this.http.post(`http://192.168.1.30:5151/api/dashboard/execute`,joinDetails);
  }

  GetDataTypeData(table: string){
    const payload = {tableName: table}
    return this.http.post("http://192.168.1.30:5151/api/dashboard/get-columns",payload);
    //http://192.168.1.30:5151/api/dashboard/get-columns
    //http://192.168.1.76:5100/api/Database/get-columns
  }

  GetDistinctColValues(table:string, col: string){
    const payload = {tableName: table , columns: [col]}
    return this.http.post("http://192.168.1.30:5151/api/dashboard/distinct-values",payload)
    //http://192.168.1.30:5151/api/dashboard/distinct-values
    //http://192.168.1.76:5400/api/Database/distinct
  }

  GetFilterData(filterBody: any){
    console.log("filter data pass:",filterBody);
    return this.http.post("http://192.168.1.30:5151/api/dashboard/execute",filterBody)
  }
}