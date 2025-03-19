import { Filter } from "./Filter";
import { Join } from "./Join";

export interface Query{
  id: number;
  name: string;
  selectedTable: string;
  selectedColumns: string[];
  allColumns: string[];
  columnList: string[];
  tableData: any[];
  filters: Filter[];
  joins: Join[]
}







