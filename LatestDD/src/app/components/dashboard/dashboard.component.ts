import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../Services/api.service';
import { HeaderComponent } from '../header/header.component';

// Extend the Query interface
interface Query {
  id: number;
  name: string;
  selectedTable?: string;
  columns?: string[];
  tableData?: any[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  title = 'DynamicDahboard';

  ngOnInit(): void {
    this.gettabledata();
  }

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Existing methods...

  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.tabledata.sort((a, b) => {
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

  Apidata = inject(ApiService);
  payload: [] = [];
  @ViewChild('overlay') overlay!: ElementRef;

  // Overlays and flags (unchanged)
  showOverlay = false;
  showTableOverlay = false;
  showColumnOverlay = false;
  showAddColumnOverlay = false;
  showJoinTableOverlay = false;
  showAppendTableOverlay = false;
  showCustomOperationOverlay = false;
  showFilterRowsOverlay = false;
  showGroupSummarizeOverlay = false;
  showSqlTemplateOverlay = false; // New flag for SQL template overlay

  tables: any[] = [];
  selectedTable: string = '';

  columns: string[] = [];
  //Just for storing of column names and showing in column dropdown.
  columnList: string[] = [];
  selectedColumns: string[] = [];
  rightcolumns: string[] = [];

  tabledata: any[] = [];

  // SQL related properties
  sqlTemplate: string = '';
  hasOperations: boolean = false;

  // ***** Query Management *****
  queries: Query[] = [];
  queryCount: number = 0;
  selectedQuery: Query | null = null;
  queryTitle: string = '';

  // (Other properties remain unchanged)
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
      'within',
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

  aggregateFunctions = [
    'Count of',
    'Sum of',
    'Average of',
    'Minimum of',
    'Maximum of',
    'Unique count of',
  ];
  groupings = [
    { groupByColumn: '', aggregateFunction: '', aggregateColumn: '' },
  ];

  newColumnExpression = '';
  newColumnName = '';
  newColumnType = '';
  columnTypes = [
    'String',
    'Text',
    'Integer',
    'Decimal',
    'Date',
    'Time',
    'Datetime',
  ];

  selectedJoinTable = '';
  selectedLeftColumn = '';
  selectedRightColumn = '';
  selectedJoinType = '';
  selectedJoinColumns: string[] = [];
  joinTypes = ['Inner Join', 'Left Join', 'Right Join', 'Full Join'];

  selectedTableToAppend: string = '';
  dropDuplicates: string = 'No';
  customExpression: string = '';

  chartsCount: number = 0;
  dashboardCount: number = 0;

  // GETTING TABLE NAMES.
  gettabledata() {
    this.Apidata.GetTableApi(this.payload).subscribe(
      (res: any) => (this.tables = res)
    );
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
    this.Apidata.GetColumnApi(table1).subscribe(
      (res: any) => (this.rightcolumns = res)
    );
  }

  //FOR GETTING FULL TABLE DATA.
  getdata() {
    this.Apidata.GetData(this.selectedTable).subscribe((res: any) => {
      this.columns = Object.keys(res[0]);
      // this.getcolumndata(this.selectedTable);
      this.tabledata = res;
      // Ensure selectedColumns updates based on the query's selection
      if (this.selectedQuery?.columns?.length) {
        this.selectedColumns = this.selectedQuery.columns.filter((col) =>
          this.columns.includes(col)
        );
      } else {
        this.columns = [...this.columns]; // Default to all columns
      }
    });
  }

  RightTable(Rtable: string) {
    this.getrightcolumndata(Rtable);
  }

  // View SQL implementation
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
    if (!this.selectedTable) {
      return false;
    }
    // If at least a table is selected, consider it as having operations
    return true;
  }

  generateSqlTemplate() {
    debugger;
    let sql = '';

    // Begin with SELECT statement
    if (this.selectedColumns.length > 0) {
      sql += `SELECT ${this.selectedColumns.join(', ')}\n`;
    } else {
      sql += 'SELECT *\n';
    }

    // Add FROM clause
    sql += `FROM ${this.selectedTable}\n`;

    // Add JOIN if present
    if (
      this.selectedJoinTable &&
      this.selectedLeftColumn &&
      this.selectedRightColumn &&
      this.selectedJoinType
    ) {
      const joinType = this.selectedJoinType.toUpperCase();
      sql += `${joinType} ${this.selectedJoinTable} ON ${this.selectedTable}.${this.selectedLeftColumn} = ${this.selectedJoinTable}.${this.selectedRightColumn}\n`;
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

  // Query Methods
  addQueries() {
    this.queryCount = this.queries.length + 1;
    this.queries.push({
      id: this.queryCount,
      name: `Query ${this.queryCount}`,
    });
  }
  openQuery(query: Query) {
    this.selectedQuery = query;
    this.queryTitle = query.name;

    if (query.selectedTable) {
      this.selectedTable = query.selectedTable;
      this.getcolumndata(query.selectedTable);
      this.getdata();
    } else {
      this.selectedTable = '';
      this.selectedColumns = [];
      this.columns = [];
      this.tabledata = [];
    }
  }
  updateSelectedQueryName() {
    if (this.selectedQuery) {
      this.selectedQuery.name = this.queryTitle;
    }
  }
  deleteQuery(queryId: number): void {
    this.queries = this.queries.filter((query) => query.id !== queryId);
    // Optional: Confirm deletion with the user
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
    if (this.selectedQuery) {
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
  confirmJoinTable() {
    console.log('Join Table Details:', {
      JoinTable: this.selectedJoinTable,
      LeftColumn: this.selectedLeftColumn,
      RightColumn: this.selectedRightColumn,
      JoinType: this.selectedJoinType,
      SelectedColumns: this.selectedJoinColumns,
    });
    this.showJoinTableOverlay = false;
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
  editTable() {
    this.showTableOverlay = true;
  }
  editColumn() {
    this.showColumnOverlay = true;
  }
  editFilter() {
    this.showFilterRowsOverlay = true;
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
