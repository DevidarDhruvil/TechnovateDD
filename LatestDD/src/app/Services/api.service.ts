import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
 
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor() {}
  http = inject(HttpClient);
 

  //Calls the API to get the list of tables.
  GetTableApi(payload: any) {
    return this.http.post('http://192.168.1.76:5100/api/Database/tables', payload);
    //http://192.168.1.30:5151/api/dashboard/tables
    //http://192.168.1.76:5100/api/Database/tables
  }


  //Calls the API to get the list of columns.
  GetColumnApi(selectedTable: string){
    const payload = {tableName:selectedTable}
    return this.http.post("http://192.168.1.76:5100/api/Database/columns",payload);
    //http://192.168.1.30:5151/api/dashboard/fields
    //http://192.168.1.76:5100/api/Database/columns
  }
 

  //Calls the API to get the data of the selected table.
  GetData(selectedTable: string) {
    const payload = {tableName: selectedTable}
    return this.http.post(`http://192.168.1.76:5100/api/Database/table-data`,payload);
    // http://192.168.1.30:5151/api/dashboard/dynamic-query
    //http://192.168.1.76:5100/api/Database/table-data
  }
 

  //Calls the API to get the Join data of the selected table.
  GetJoinTableData(joinDetails: any){
    return this.http.post(`http://192.168.1.76:5100/api/DynamicQuery/execute`,joinDetails);
    //http://192.168.1.30:5151/api/dashboard/execute
    //http://192.168.1.76:5100/api/DynamicQuery/execute
  }


  //Calls the API to get the Datatype of all columns of the selected table.
  GetDataTypeData(table: string){
    const payload = {tableName: table}
    return this.http.post("http://192.168.1.76:5100/api/Database/get-columns",payload);
    //http://192.168.1.30:5151/api/dashboard/get-columns
    //http://192.168.1.76:5100/api/Database/get-columns
  }


  //Calls the API to get the distinct values of the selected column.
  GetDistinctColValues(table:string, col: string){
    const payload = {tableName: table , columnName: col}
    return this.http.post("http://192.168.1.76:5100/api/Database/distinct",payload)
    //http://192.168.1.30:5151/api/dashboard/distinct-values
    //http://192.168.1.76:5100/api/Database/distinct
  }


  //Calls the API to get the filter data.
  GetFilterData(filterBody: any){
    console.log("filter data pass:",filterBody);
    return this.http.post("http://192.168.1.76:5100/api/DynamicQuery/execute",filterBody)
    //http://192.168.1.76:5100/api/DynamicQuery/execute
    //http://192.168.1.30:5151/api/dashboard/execute
  }
  GetSqlQuery(filterBody: any) {
    console.log('Query Saved:', filterBody);
    debugger;
    return this.http.post(
      'http://192.168.1.76:5400/api/Query/execute',
      filterBody
    );
  }
  GetsqlData(filterBody:any){
    return this.http.post('http://192.168.1.76:5400/api/Query/saved',filterBody)
  }

}