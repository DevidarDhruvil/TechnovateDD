import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../Services/api.service';
import { HeaderComponent } from '../header/header.component';

interface Query {
  id: number;
  name: string;
  selectedTable: string;
  selectedColumns: string[];
  allColumns: string[];
  columnList: string[];
  tableData: any[];
  rightTable: string;
  rightColumns: string[];
  selectedJoinTable: string;
  selectedJoinType: string;
  selectedLeftColumn: string;
  selectedRightColumn: string;
  filters: Filter[];
}

interface FilterColumn {
  name: string;
  type: 'string' | 'DateTime' | 'integer' | 'decimal';
  values: string[] | number[];
}

interface Filter {
  column: string;
  operation: string;
  value: string | number;
  availableOperations: string[];
  availableValues: (string | number)[];
  condition: 'AND' | 'OR';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  title = 'DynamicDashboard';
  queries: Query[] = [];
  queryCount = 0;
  selectedQuery: Query | null = null;
  queryTitle = '';
  tables: string[] = [];
  apiService = inject(ApiService);

  @ViewChild('overlay') overlay!: ElementRef;

  // Overlay flags
  showOverlay = false;
  showTableOverlay = false;
  showColumnOverlay = false;
  showAddColumnOverlay = false;
  showJoinTableOverlay = false;
  showAppendTableOverlay = false;
  showCustomOperationOverlay = false;
  showFilterRowsOverlay = false;
  showGroupSummarizeOverlay = false;
  showSqlTemplateOverlay = false;

  // Shared options
  joinTypes = ['inner', 'left', 'right', 'full'];
  columnTypes = [ 'String', 'Text', 'Integer', 'Decimal', 'Date', 'Time', 'Datetime'];
  filterColumns: FilterColumn[] = [
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
  operations: Record<string, string[]> = {
    string: [
      'is',
      'is not',
      'contains',
      'does not contain',
      'starts with',
      'ends with',
      'is set',
      'is not set',
    ],
    DateTime: [
      'equals',
      'not equals',
      'greater than',
      'greater than or equals',
      'less than',
      'less than or equals',
      'between',
      // 'within',
    ],
    integer: [
      'equals',
      'not equals',
      'greater than',
      'greater than or equals',
      'less than',
      'less than or equals',
      'between',
    ],
    decimal: [
      'equals',
      'not equals',
      'greater than',
      'greater than or equals',
      'less than',
      'less than or equals',
      'between',
    ],
  };
  aggregateFunctions = [
    'Count of',
    'Sum of',
    'Average of',
    'Minimum of',
    'Maximum of',
    'Unique count of',
  ];

  // Temporary state for overlays
  newColumnExpression = '';
  newColumnName = '';
  newColumnType = '';
  selectedTableToAppend = '';
  dropDuplicates = 'No';
  customExpression = '';
  filters: Filter[] = [];
  groupings = [
    { groupByColumn: '', aggregateFunction: '', aggregateColumn: '' },
  ];

  ngOnInit(): void {
    this.getTableNames();
  }

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  tabledata: any[] = [];
  columns: string[] = [];
  selectedColumns: string[] = [];

  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.selectedQuery?.tableData.sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];

      // Function to classify and extract text and numbers
      const classifyValue = (value: string) => {
        if (/^\d+$/.test(value)) {
          return { type: 'number', value: parseInt(value, 10) };
        } else if (/[a-zA-Z]+_\d+/.test(value)) {
          // Matches Name_4, Name_10, etc.
          const match = value.match(/([a-zA-Z_]+)(\d+)/);
          return {
            type: 'stringWithNumber',
            text: match ? match[1] : value,
            number: match && match[2] ? parseInt(match[2], 10) : 0,
          };
        }
        return { type: 'string', value: value };
      };

      const aParts = classifyValue(aValue);
      const bParts = classifyValue(bValue);

      // Numbers come first
      if (aParts.type === 'number' && bParts.type === 'number') {
        return this.sortDirection === 'asc'
          ? (aParts.value as number) - (bParts.value as number)
          : (bParts.value as number) - (aParts.value as number);
      }
      if (aParts.type === 'number' && bParts.type !== 'number') {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aParts.type !== 'number' && bParts.type === 'number') {
        return this.sortDirection === 'asc' ? 1 : -1;
      }

      // Sorting logic for strings with numbers
      if (
        aParts.type === 'stringWithNumber' &&
        bParts.type === 'stringWithNumber'
      ) {
        if (
          aParts.text !== undefined &&
          bParts.text !== undefined &&
          aParts.text !== bParts.text
        ) {
          return this.sortDirection === 'asc'
            ? aParts.text.localeCompare(bParts.text)
            : bParts.text.localeCompare(aParts.text);
        }
        return this.sortDirection === 'asc'
          ? (aParts.number ?? 0) - (bParts.number ?? 0)
          : (bParts.number ?? 0) - (aParts.number ?? 0);
      }

      // Pure strings should be sorted alphabetically
      return this.sortDirection === 'asc'
        ? (aParts.value as string).localeCompare(bParts.value as string)
        : (bParts.value as string).localeCompare(aParts.value as string);
    });
  }

  getTableNames() {
    this.apiService.GetTableApi([]).subscribe((res: any) => {
      this.tables = res;
    });
  }

  addQueries() {
    this.queryCount++;
    const newQuery: Query = {
      id: this.queryCount,
      name: `Query ${this.queryCount}`,
      selectedTable: '',
      selectedColumns: [],
      allColumns: [],
      columnList: [],
      tableData: [],
      rightTable: '',
      rightColumns: [],
      selectedJoinTable: '',
      selectedJoinType: '',
      selectedLeftColumn: '',
      selectedRightColumn: '',
      filters: [],
    };
    this.queries.push(newQuery);
    this.openQuery(newQuery);
  }

  openQuery(query: Query) {
    this.selectedQuery = query;
    this.queryTitle = query.name;
    this.filters = query.filters;

    if (query.selectedTable) {
      if (query.selectedJoinTable && query.tableData.length === 0) {
        this.fetchJoinData();
      } else if (query.tableData.length === 0) {
        this.fetchTableData();
      }
    }
  }

  updateSelectedQueryName() {
    if (this.selectedQuery) {
      this.selectedQuery.name = this.queryTitle;
    }
  }

  deleteQuery(queryId: number) {
    this.queries = this.queries.filter((q) => q.id !== queryId);
    if (this.selectedQuery?.id === queryId) {
      this.selectedQuery = null;
      this.queryTitle = '';
    }
  }

  selectTable(table: string) {
    if (this.selectedQuery) {
      this.selectedQuery.selectedTable = table;
      this.fetchColumnNames(table);
      this.fetchDataTypeData(table);
      this.fetchTableData();
    }
    this.closeTableOverlay();
  }

  fetchColumnNames(table: string) {
    this.apiService.GetColumnApi(table).subscribe((res: any) => {
      if (this.selectedQuery) {
        this.selectedQuery.columnList = res;
      }
    });
  }

  dataType: Record<string, string> = {};

  fetchDataTypeData(table:string){
    this.apiService.GetDataTypeData(table).subscribe((res: any) => {
      this.dataType = res;
      console.log(this.dataType);
    })
  }

  fetchDistinctColValues(index: number, columnName: string, tableName: string) {
    this.apiService.GetDistinctColValues(tableName, columnName).subscribe((res: any)=> {
      this.filters[index].availableValues = res || [];
    })
  }

  fetchFilterData(filterDetails: any){
    if (
      this.selectedQuery &&
      this.selectedQuery.selectedTable
    ) {
    const query = this.selectedQuery;
    // filterDetails.forEach((filterBody: any) => {
      this.apiService.GetFilterData(filterDetails).subscribe((res: any) => {
        if (res.length === 0) {
          query.tableData = [];
        } else {
          query.allColumns = Object.keys(res[0]);
          query.tableData = res;
          // query.selectedColumns = [...query.allColumns];
        }
        }
      );
  }
  }

  fetchTableData() {
    if (this.selectedQuery && this.selectedQuery.selectedTable) {
      const query = this.selectedQuery;
      this.apiService.GetData(query.selectedTable).subscribe((res: any) => {
        query.allColumns = Object.keys(res[0]);
        query.tableData = res;
        // query.selectedColumns = query.selectedColumns.length
        //   ? query.selectedColumns.filter((col) =>
        //       query.allColumns.includes(col)
        //     )
        //   : [...query.allColumns];
      });
    }
  }

  toggleColumnSelection(column: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (this.selectedQuery) {
      if (isChecked && !this.selectedQuery.selectedColumns.includes(column)) {
        this.selectedQuery.selectedColumns.push(column);
      } else if (!isChecked) {
        this.selectedQuery.selectedColumns =
          this.selectedQuery.selectedColumns.filter((col) => col !== column);
      }
    }
  }

  closeTableOverlay() {
    this.showTableOverlay = false;
  }

  closeColumnOverlay() {
    this.showColumnOverlay = false;
  }

  RightTable(table: string) {
    if (this.selectedQuery) {
      this.selectedQuery.rightTable = table;
      this.fetchRightColumnNames(table);
    }
  }

  fetchRightColumnNames(table: string) {
    this.apiService.GetColumnApi(table).subscribe((res: any) => {
      if (this.selectedQuery) {
        this.selectedQuery.rightColumns = res;
      }
    });
  }

  confirmJoinTable() {
    if (this.selectedQuery) {
      this.fetchJoinData();
    }
    this.showJoinTableOverlay = false;
  }

  fetchJoinData() {
    if (
      this.selectedQuery &&
      this.selectedQuery.selectedTable &&
      this.selectedQuery.selectedJoinTable
    ) {
      const query = this.selectedQuery;
      const joinDetails = {
        JoinTable: query.selectedJoinTable,
        LeftColumn: query.selectedLeftColumn,
        RightColumn: query.selectedRightColumn,
        JoinType: query.selectedJoinType,
        LeftTable: query.selectedTable,
      };
      this.apiService.GetJoinTableData(joinDetails).subscribe((res: any) => {
        if (res.length === 0) {
          query.tableData = [];
          query.selectedColumns = [];
        } else {
          query.allColumns = Object.keys(res[0]);
          query.tableData = res;
          // query.selectedColumns = [...query.allColumns];
        }
      });
    }
  }

  confirmAddColumn() {
    console.log('New Column:', {
      Expression: this.newColumnExpression,
      Name: this.newColumnName,
      Type: this.newColumnType,
    });
    this.closeAddColumnOverlay();
  }

  closeAddColumnOverlay() {
    this.showAddColumnOverlay = false;
    this.newColumnExpression = '';
    this.newColumnName = '';
    this.newColumnType = '';
  }

  confirmAppendTable() {
    console.log('Append Table:', {
      Table: this.selectedTableToAppend,
      DropDuplicates: this.dropDuplicates,
    });
    this.closeAppendTableOverlay();
  }

  closeAppendTableOverlay() {
    this.showAppendTableOverlay = false;
    this.selectedTableToAppend = '';
    this.dropDuplicates = 'No';
  }

  confirmCustomOperation() {
    console.log('Custom Expression:', this.customExpression);
    this.closeCustomOperationOverlay();
  }

  closeCustomOperationOverlay() {
    this.showCustomOperationOverlay = false;
    this.customExpression = '';
  }

  addFilter() {
    debugger;
    if(this.selectedQuery){
      this.selectedQuery.filters = [
        ...this.selectedQuery.filters,
        {
          column: '',
          operation: '',
          value: '',
          availableOperations: [],
          availableValues: [],
          condition: 'AND',
        },
      ];
  
      // ✅ Ensure Angular detects the change
      this.filters = [...this.selectedQuery.filters];
    }
  }

  removeFilter(index: number) {
    if(this.selectedQuery){
      this.selectedQuery.filters.splice(index, 1);
      // ✅ Ensure the UI updates
      this.filters = [...this.selectedQuery.filters];
    }
  }

  updateOperations(index: number) {
    const selectedColumn = this.filters[index].column;
    const columnType = this.dataType[selectedColumn]; // Get data type from dataType object

    if (columnType) {
      this.filters[index].availableOperations = this.operations[columnType] || [];
      this.filters[index].operation = '';
      this.filters[index].availableValues = []; // Reset values when column changes

      // Fetch values for the selected column
      if (this.selectedQuery?.selectedTable) {
        this.fetchDistinctColValues(index, selectedColumn, this.selectedQuery.selectedTable);
      }
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
    if(this.selectedQuery){
      this.selectedQuery.filters = [];
      this.filters = [...this.selectedQuery.filters];
      this.fetchTableData();
    }
  }

  applyFilters() {
    if (!this.selectedQuery?.selectedTable) {
      alert('Please select a table first.');
      return;
    }
    
    const filters = this.filters
        .filter(filter => filter.column && filter.operation && filter.value !== '') // Ensure valid filters
        .map((filter, index) => {
            const filterObject: any = {
                columnName: filter.column,
                operator: filter.operation,
                value: filter.value.toString(),
            };

            // Add logicalOperator only if there’s more than one filter
            if (this.filters.length > 1 && index !== this.filters.length - 1) {
                filterObject.logicalOperator = filter.condition; // AND/OR
            }

            return filterObject;
        });

        const requestBody = {
          tableName: this.selectedQuery.selectedTable,
          filters: filters,
      };

    console.log("filterConditions:" ,requestBody);

    this.fetchFilterData(requestBody);
    this.closeFilterRowsOverlay();
  }

  closeFilterRowsOverlay() {
    this.showFilterRowsOverlay = false;
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
    console.log('Groupings:', this.groupings);
    this.closeGroupSummarizeOverlay();
  }

  closeGroupSummarizeOverlay() {
    this.showGroupSummarizeOverlay = false;
  }
  
  addCharts() {
    const chartsContainer = document.getElementById('chartsContainer');
    if (chartsContainer) {
      const chartDiv = document.createElement('div');
      chartDiv.textContent = `Chart ${chartsContainer.children.length + 1}`;
      chartsContainer.appendChild(chartDiv);
    }
  }

  addDashboard() {
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (dashboardContainer) {
      const dashboardDiv = document.createElement('div');
      dashboardDiv.textContent = `Dashboard ${
        dashboardContainer.children.length + 1
      }`;
      dashboardContainer.appendChild(dashboardDiv);
    }
  }

  editTable() {
    this.showTableOverlay = true;
  }

  editColumn() {
    this.showColumnOverlay = true;
  }

  editJoin() {
    this.showJoinTableOverlay = true;
  }

  editFilter(){
    this.showFilterRowsOverlay = true;
  }

  toggleOverlay(event: Event) {
    this.showOverlay = !this.showOverlay;
    event.stopPropagation();
  }

  openTableOverlay() {
    this.showTableOverlay = true;
    this.showOverlay = false;
  }

  openColumnOverlay() {
    this.showColumnOverlay = true;
    this.showOverlay = false;
  }

  openAddColumnOverlay() {
    this.showAddColumnOverlay = true;
    this.showOverlay = false;
  }

  openJoinTableOverlay() {
    this.showJoinTableOverlay = true;
    this.showOverlay = false;
  }

  openAppendTableOverlay() {
    this.showAppendTableOverlay = true;
    this.showOverlay = false;
  }

  openCustomOperationOverlay() {
    this.showCustomOperationOverlay = true;
    this.showOverlay = false;
  }

  openFilterRowsOverlay() {
    this.showFilterRowsOverlay = true;
    this.showOverlay = false;
  }

  openGroupSummarizeOverlay() {
    this.showGroupSummarizeOverlay = true;
    this.showOverlay = false;
  }

  closeJoinTableOverlay() {
    this.showJoinTableOverlay = false;
  }

  hasOperations: boolean = false;
  sqlTemplate: string = '';
  viewSql() {
    this.hasOperations = this.checkForOperations();
    if (!this.hasOperations) {
      this.sqlTemplate =
        'No operations have been performed. Please select a table and perform operations first.';
    } else {
      this.generateSqlTemplate();
    }
    this.showSqlTemplateOverlay = !this.showSqlTemplateOverlay;
  }
  checkForOperations(): boolean {
    // Check if any operations have been performed
    if (!this.selectedQuery?.selectedTable) {
      return false;
    }
    // If at least a table is selected, consider it as having operations
    return true;
  }

  generateSqlTemplate() {
    debugger;
    let sql = '';

    // Begin with SELECT statement
    if (this.selectedQuery) {
      if (this.selectedQuery.selectedColumns.length > 0) {
        sql += `SELECT ${this.selectedQuery.selectedColumns.join(', ')}\n`;
      } else {
        sql += 'SELECT *\n';
      }
    }

    // Add FROM clause
    sql += `FROM ${this.selectedQuery?.selectedTable}\n`;

    // Add JOIN if present
    if (
      this.selectedQuery?.selectedJoinTable &&
      this.selectedQuery?.selectedLeftColumn &&
      this.selectedQuery?.selectedRightColumn &&
      this.selectedQuery?.selectedJoinType
    ) {
      const joinType = this.selectedQuery?.selectedJoinType.toUpperCase();
      sql += `${joinType} ${this.selectedQuery?.selectedJoinTable} ON ${this.selectedQuery?.selectedTable}.${this.selectedQuery?.selectedLeftColumn} = ${this.selectedQuery?.selectedJoinTable}.${this.selectedQuery?.selectedRightColumn}\n`;
    }

    // Add WHERE clause for filters
    if (
      this.filters.some(
        (f: { column: any; operation: any; value: any }) =>
          f.column && f.operation && f.value
      )
    ) {
      sql += 'WHERE ';
      let filterClauses = [];

      for (let i = 0; i < this.filters.length; i++) {
        const filter = this.filters[i];
        if (filter.column && filter.operation && filter.value !== undefined) {
          let clause = '';

          // Format the condition based on operation type
          switch (filter.operation) {
            case 'contains':
              clause = `${filter.column} LIKE '%${filter.value}%'`;
              break;
            case 'does not contain':
              clause = `${filter.column} NOT LIKE '%${filter.value}%'`;
              break;
            case 'starts with':
              clause = `${filter.column} LIKE '${filter.value}%'`;
              break;
            case 'ends with':
              clause = `${filter.column} LIKE '%${filter.value}'`;
              break;
            case 'is':
            case 'equals':
              clause = `${filter.column} = '${filter.value}'`;
              break;
            case 'is not':
            case 'not equals':
              clause = `${filter.column} != '${filter.value}'`;
              break;
            case 'greater than':
              clause = `${filter.column} > ${filter.value}`;
              break;
            case 'greater than or equals':
              clause = `${filter.column} >= ${filter.value}`;
              break;
            case 'less than':
              clause = `${filter.column} < ${filter.value}`;
              break;
            case 'less than or equals':
              clause = `${filter.column} <= ${filter.value}`;
              break;
            case 'between':
              if (Array.isArray(filter.value) && filter.value.length >= 2) {
                clause = `${filter.column} BETWEEN ${filter.value[0]} AND ${filter.value[1]}`;
              }
              break;
            default:
              clause = `${filter.column} ${filter.operation} '${filter.value}'`;
          }

          filterClauses.push(clause);
        }
      }

      // Join filters with AND/OR
      if (filterClauses.length > 0) {
        sql += filterClauses.join(` ${this.filters[0].condition} `);
      }
      sql += '\n';
    }

    // Add GROUP BY and aggregation if present
    if (this.groupings.some((g) => g.groupByColumn)) {
      const groupColumns = this.groupings
        .filter((g) => g.groupByColumn)
        .map((g) => g.groupByColumn);

      if (groupColumns.length > 0) {
        sql += `GROUP BY ${groupColumns.join(', ')}\n`;
      }

      // Add HAVING clause for aggregate filters if needed
      // (This would be more complex and would depend on your specific implementation)
    }

    // Add any custom expressions
    if (this.customExpression) {
      sql += `-- Custom Expression: ${this.customExpression}\n`;
    }

    this.sqlTemplate = sql;
  }

  closeSqlTemplateOverlay() {
    this.showSqlTemplateOverlay = false;
  }

  copySqlToClipboard() {
    navigator.clipboard.writeText(this.sqlTemplate).then(
      () => {
        alert('SQL copied to clipboard!');
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.showOverlay &&
      this.overlay &&
      !this.overlay.nativeElement.contains(event.target)
    ) {
      this.showOverlay = false;
    }
  }
}
