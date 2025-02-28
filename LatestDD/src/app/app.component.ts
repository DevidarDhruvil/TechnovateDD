import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './Services/api.service';
import { HeaderComponent } from './components/header/header.component';
import { isEmpty } from 'rxjs';

// Extend the Query interface
interface Query {
  id: number;
  name: string;
  selectedTable?: string;
  selectedColumns?: [];
  allColumns?: string[];
  columns?: string[];
  tableData?: any[];
  rightTable?: string;
  rightcolumns?: string[];
  selectedJoinTable?: string;
  selectedJoinType?: string;
  selectedLeftColumn?: string;
  selectedRightColumn?: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})

export class AppComponent implements OnInit {
  title = 'DynamicDahboard';

  ngOnInit(): void {
    this.gettabledata();
  }
  constructor(){
    this.joinDetails = {
      JoinTable: '',
      LeftColumn: '',
      RightColumn: '',
      JoinType: '',
      LeftTable: ''
    };
  }

  Apidata = inject(ApiService);
  payload: [] =[]
  @ViewChild('overlay') overlay!: ElementRef;

  // Overlays.
  showOverlay = false;
  showTableOverlay = false;
  showColumnOverlay = false;
  showAddColumnOverlay = false;
  showJoinTableOverlay = false;
  showAppendTableOverlay = false;
  showCustomOperationOverlay = false;
  showFilterRowsOverlay = false;
  showGroupSummarizeOverlay = false;

  tables: any[] = [];
  selectedTable: string = '';

  columns: string[] = [];
  allColumns: string[] = [];
  //Just for storing of column names and showing in column dropdown.
  columnList:string[] = []
  selectedColumns: string[] = [];
  rightcolumns: string[] = [];
  
  tabledata: any[] = [];

  // ***** Query Management *****
  queries: Query[] = [];
  queryCount: number = 0;
  selectedQuery: Query | null = null;
  queryTitle: string = '';

  filterColumns = [
    {
      name: 'Customer Name',
      type: 'string',
      values: ['Alice', 'Bob', 'Charlie'],
    },
    {
      name: 'Order Date',
      type: 'DateTime',
      values: ['2024-01-01', '2024-01-15', '2024-02-01'],
    },
    { name: 'Quantity', type: 'integer', values: [1, 2, 5, 10] },
    { name: 'Price', type: 'decimal', values: [10.99, 20.5, 100.75] },
  ];

  operations: any = {
    string: [ 'is', 'is not', 'contains', 'does not contain', 'starts with', 'ends with', 'is set', 'is not set'],
    DateTime: [ 'equals', 'not equals', 'greater than', 'greater than or equals', 'less than', 'less than or equals', 'between', 'within'],
    integer: [ 'equals', 'not equals', 'greater than', 'greater than or equals', 'less than', 'less than or equals', 'between'],
    decimal: [ 'equals', 'not equals', 'greater than', 'greater than or equals', 'less than', 'less than or equals', 'between'],
  };

  filters: any = [
    {
      column: '',
      operation: '',
      value: '',
      availableOperations: [],
      availableValues: [],
      condition: 'AND',
    },
  ];

  aggregateFunctions = ['Count of', 'Sum of', 'Average of', 'Minimum of', 'Maximum of', 'Unique count of'];
  groupings = [{ groupByColumn: '', aggregateFunction: '', aggregateColumn: '' }];

  newColumnExpression = '';
  newColumnName = '';
  newColumnType = '';
  columnTypes = ['String', 'Text', 'Integer', 'Decimal', 'Date', 'Time', 'Datetime'];

  selectedJoinTable = '';
  rightTable: string = ''
  selectedLeftColumn = '';
  selectedRightColumn = '';
  selectedJoinType = '';
  selectedJoinColumns: string[] = [];
  joinTypes = ['inner', 'left', 'right', 'full'];

  selectedTableToAppend: string = '';
  dropDuplicates: string = 'No';
  customExpression: string = '';

  
  chartsCount: number = 0;
  dashboardCount: number = 0;

  // GETTING TABLE NAMES.
  gettabledata() {
    this.Apidata.GetTableApi(this.payload).subscribe((res: any) => (this.tables = res));
  }

  //GETTING COLUMN NAMES.
  getcolumndata(table1: string) {
    this.Apidata.GetColumnApi(table1).subscribe((res: any) => {
      this.columnList = res;
      this.selectedColumns = [];
    });
  }

  //GETTING COLUMN NAMES FOR RIGHT TABLE IN JOINING.
  getrightcolumndata(table1: string) {
    debugger;
    this.Apidata.GetColumnApi(table1).subscribe(
      (res: any) => (this.rightcolumns = res)
    );
  }

  //FOR GETTING FULL TABLE DATA.
  getdata() {
    this.Apidata.GetData(this.selectedTable).subscribe((res: any) => {
      this.columns = Object.keys(res[0]);
      this.allColumns=this.columns;
      this.tabledata = res;

      if (this.selectedQuery?.columns?.length) {
        this.selectedColumns = this.selectedQuery.columns.filter(col => this.columns.includes(col));
      } 
      else {
        this.columns = [...this.columns]; // Default to all columns
      }
    });
  }
  
  getJoinData(){
    this.Apidata.GetJoinTableData(this.joinDetails).subscribe((res:any)=>{
      if(res.length===0) {
        this.tabledata=[];
        this.selectedColumns=[];
      }
      else {
        this.allColumns = Object.keys(res[0]);
        if(this.selectedQuery){
          this.selectedQuery.tableData = res;
        }
        this.tabledata = res;
      }
    })
  }

  RightTable(Rtable: string) {
    debugger;
    this.rightTable = Rtable;
    if (this.selectedQuery) {
      this.selectedQuery.rightTable = Rtable;
    }
    this.getrightcolumndata(Rtable);
  }

  // Query Methods
  addQueries() {
    this.queryCount = this.queries.length + 1;
    this.queries.push({
      id: this.queryCount,
      name: `Query ${this.queryCount}`,
      rightTable: '',
      selectedTable: '',
      selectedColumns: [],
      allColumns:[],
      columns: [],
      rightcolumns: [],
      tableData: [],
      selectedJoinTable: '',
      selectedJoinType: '',
      selectedLeftColumn: '',
      selectedRightColumn: ''
    });
  }
  openQuery(query: Query) {
    this.selectedQuery = query;
    this.queryTitle = query.name;
    debugger;
    if (query.selectedTable) {
      this.selectedTable = query.selectedTable;
      this.getcolumndata(query.selectedTable);
debugger;
      if (query.selectedColumns && query.rightTable && query.selectedJoinTable && query.selectedJoinType && query.selectedLeftColumn && query.selectedRightColumn) {
        this.selectedColumns = query.selectedColumns
        this.rightTable = query.rightTable;
        this.selectedJoinTable = query.selectedJoinTable;
        this.selectedJoinType = query.selectedJoinType;
        this.selectedLeftColumn = query.selectedLeftColumn;
        this.selectedRightColumn = query.selectedRightColumn;
        debugger;
        this.RightTable(this.rightTable);
        this.getrightcolumndata(this.rightTable);
        // this.getJoinData();
        this.confirmJoinTable();
      } else {
        this.selectedJoinTable = '';
        this.selectedJoinType = '';
        this.rightTable = '';
        this.rightcolumns = []
        this.selectedLeftColumn = '';
        this.selectedRightColumn = '';
        this.getdata();
      }
    } else {
      this.selectedTable = '';
      this.selectedColumns = [];
      this.columns = [];
      this.allColumns = [];
      this.rightTable = '';
      this.rightcolumns = [];
      this.tabledata = [];
      this.selectedJoinTable = '';
      this.selectedJoinType = '';
      this.selectedLeftColumn = '';
      this.selectedRightColumn = '';
    }
  }
  updateSelectedQueryName() {
    if (this.selectedQuery) {
      this.selectedQuery.name = this.queryTitle;
    }
  }
  deleteQuery(queryId: number): void {
    this.queries = this.queries.filter((query) => query.id !== queryId);
  }


  toggleOverlay(event: Event) {
    this.showOverlay = !this.showOverlay;
    event.stopPropagation();
  }
  openTableOverlay() {
    this.showTableOverlay = true;
    this.showOverlay = false;
  }
  selectTable(table: string) {
    this.selectedTable = table;
    if (this.selectedQuery) {
      this.selectedQuery.selectedTable = table;
    }
    this.getcolumndata(table);
    this.closeTableOverlay();
    this.getdata();
    this.showTableOverlay = false;
  }
  closeTableOverlay() {
    this.showTableOverlay = false;
  }


  openColumnOverlay() {
    this.showColumnOverlay = true;
    this.showOverlay = false;
  }
  toggleColumnSelection(column: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      if (!this.selectedColumns.includes(column)) {
        this.selectedColumns.push(column);
      }
    } else {
      this.selectedColumns = this.selectedColumns.filter(
        (col) => col !== column
      );
    }
    if(this.selectedQuery){
      this.selectedQuery.columns = [...this.selectedColumns];
    }
  }
  confirmColumnSelection() {
    console.log('Selected Columns:', this.selectedColumns);
    this.showColumnOverlay = false;
  }
  closeColumnOverlay() {
    this.showColumnOverlay = false;
  }


  openAddColumnOverlay() {
    this.showAddColumnOverlay = true;
    this.showOverlay = false;
  }
  confirmAddColumn() {
    console.log('New Column Details:', {
      Expression: this.newColumnExpression,
      Name: this.newColumnName,
      Type: this.newColumnType,
    });
    this.showAddColumnOverlay = false;
  }
  closeAddColumnOverlay() {
    this.showAddColumnOverlay = false;
  }


  openJoinTableOverlay() {
    this.showJoinTableOverlay = true;
    this.showOverlay = false;
  }
  joinDetails: { 
    JoinTable: string; 
    LeftColumn: string; 
    RightColumn: string; 
    JoinType: string; 
    LeftTable: string; 
  };
  confirmJoinTable() {
    this.joinDetails = {
      JoinTable: this.selectedJoinTable,
      LeftColumn: this.selectedLeftColumn,
      RightColumn: this.selectedRightColumn,
      JoinType: this.selectedJoinType,
      LeftTable: this.selectedTable,
    };
    if (this.selectedQuery) {
      this.selectedQuery.selectedJoinTable = this.selectedJoinTable;
      this.selectedQuery.selectedJoinType = this.selectedJoinType;
      this.selectedQuery.selectedLeftColumn = this.selectedLeftColumn;
      this.selectedQuery.selectedRightColumn = this.selectedRightColumn;
    }
    this.showJoinTableOverlay = false;
    this.getJoinData();
  }
  closeJoinTableOverlay() {
    this.showJoinTableOverlay = false;
  }


  openAppendTableOverlay() {
    this.showAppendTableOverlay = true;
    this.showOverlay = false;
  }
  confirmAppendTable() {
    console.log('Selected Table to Append:', this.selectedTableToAppend);
    console.log('Drop Duplicates:', this.dropDuplicates);
    this.closeAppendTableOverlay();
  }
  closeAppendTableOverlay() {
    this.showAppendTableOverlay = false;
  }


  openCustomOperationOverlay() {
    this.showCustomOperationOverlay = true;
    this.showOverlay = false;
  }
  confirmCustomOperation() {
    console.log('Custom Expression:', this.customExpression);
    this.closeCustomOperationOverlay();
  }
  closeCustomOperationOverlay() {
    this.showCustomOperationOverlay = false;
  }


  addCharts() {
    this.chartsCount++;
    const newChartDiv = document.createElement('div');
    newChartDiv.textContent = `charts ${this.chartsCount}`;
    document.getElementById('chartsContainer')?.appendChild(newChartDiv);
  }
  addDashboard() {
    this.dashboardCount++;
    const newDashboardDiv = document.createElement('div');
    newDashboardDiv.textContent = `dashboard ${this.dashboardCount}`;
    document.getElementById('dashboardContainer')?.appendChild(newDashboardDiv);
  }


  openFilterRowsOverlay() {
    this.showFilterRowsOverlay = true;
    this.showOverlay = false;
  }
  closeFilterRowsOverlay() {
    this.showFilterRowsOverlay = false;
  }
  addFilter() {
    this.filters.push({
      column: '',
      operation: '',
      value: '',
      availableOperations: [],
      availableValues: [],
      condition: 'AND',
    });
  }
  removeFilter(index: number) {
    this.filters.splice(index, 1);
  }
  updateOperations(index: number) {
    const selectedColumn = this.filterColumns.find(
      (col) => col.name === this.filters[index].column
    );
    if (selectedColumn) {
      this.filters[index].availableOperations =
        this.operations[selectedColumn.type] || [];
      this.filters[index].operation = '';
      this.filters[index].availableValues = selectedColumn.values;
    }
  }
  updateValues(index: number) {
    const selectedColumn = this.filterColumns.find(
      (col) => col.name === this.filters[index].column
    );
    if (selectedColumn) {
      this.filters[index].availableValues = selectedColumn.values;
    }
  }
  clearFilters() {
    this.filters = [
      {
        column: '',
        operation: '',
        value: '',
        availableOperations: [],
        availableValues: [],
        condition: 'AND',
      },
    ];
  }
  applyFilters() {
    console.log('Applied Filters:', this.filters);
    this.closeFilterRowsOverlay();
  }


  openGroupSummarizeOverlay() {
    this.showGroupSummarizeOverlay = true;
    this.showOverlay = false;
  }
  closeGroupSummarizeOverlay() {
    this.showGroupSummarizeOverlay = false;
  }
  addGrouping() {
    this.groupings.push({
      groupByColumn: '',
      aggregateFunction: '',
      aggregateColumn: '',
    });
  }
  removeGrouping(index: number) {
    this.groupings.splice(index, 1);
  }
  clearGroupings() {
    this.groupings = [
      { groupByColumn: '', aggregateFunction: '', aggregateColumn: '' },
    ];
  }
  applyGroupings() {
    console.log('Applied Groupings:', this.groupings);
    this.closeGroupSummarizeOverlay();
  }
  editTable(){
    this.showTableOverlay=true;
  }
  editColumn(){
    this.showColumnOverlay=true;
  }
  editJoin(){
    this.showJoinTableOverlay=true;
  }


  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.overlay &&
      this.showOverlay &&
      !this.overlay.nativeElement.contains(event.target)
    ) {
      this.showOverlay = false;
    }
  }
}
