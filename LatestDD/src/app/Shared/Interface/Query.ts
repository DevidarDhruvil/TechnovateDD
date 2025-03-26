import { Filter } from "./Filter";
import { GroupingData } from "./Group";
import { Join } from "./Join";

export interface Query{
  id: number;
  name: string;
  selectedTable: string;
  selectedTableToAppend:string;
  selectedColumns: string[];
  allColumns: string[];
  columnList: string[];
  tableData: any[];
  filters: Filter[];
  joins: Join[];
  groups: GroupingData[];
  dropDuplicates:string;
}







