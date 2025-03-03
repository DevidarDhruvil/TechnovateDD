import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
 
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor() {}
  http = inject(HttpClient);
 
  GetTableApi(payload: any) {
    return this.http.post('http://192.168.1.76:5400/api/Database/tables', payload);
  }
  GetColumnApi(selectedTable: string){
    debugger;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const payload = {tableName:selectedTable}
    debugger;
    return this.http.post("http://192.168.1.76:5400/api/Database/columns",payload,{headers});
  }
 
  GetData(selectedTable: string) {
    const payload = {tableName: selectedTable}
    return this.http.post(`http://192.168.1.76:5400/api/Database/table-data`,payload);
  }
 
  GetJoinTableData(joinDetails: any){
    const payload = { leftTableName: joinDetails.LeftTable,
                      rightTableName: joinDetails.JoinTable,
                      leftColumnName: joinDetails.LeftColumn,
                      rightColumnName: joinDetails.RightColumn,
                      joinType: joinDetails.JoinType}
    return this.http.post(`http://192.168.1.76:5300/api/JoinTables/join-tables`,payload);
  }
}