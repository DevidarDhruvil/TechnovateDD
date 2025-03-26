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
import { Query } from '../../Shared/Interface/Query';
import { Join } from '../../Shared/Interface/Join';
import { Filter, FilterColumn } from '../../Shared/Interface/Filter';
import { SqlHistoryItem } from '../../Shared/Interface/SqlHistoryItem';
import { GroupingData } from '../../Shared/Interface/Group';
import { Chart } from '../../Shared/Interface/Charts';
import { Dashboard } from '../../Shared/Interface/Dashboard';

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

  charts: Chart[] = [];
  chartCount = 0;

  dashboards: Dashboard[] = [];
  dashboardCount = 0;

  selectedQuery: Query | null = null;
  queryTitle = '';
  tables: string[] = [];
  apiService = inject(ApiService);
  isCopied: boolean = false;
  queryName: string = '';
  queryTitleForSave: string = '';
  sqlHistory: SqlHistoryItem[] = [];
  sqlHistoryData: any[] = [];
  userId: number = 0;

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
  showSqlHistoryOverlay = false;
  showSaveSqlOverlay = false;

  // Shared options
  joinTypes = ['inner', 'left', 'right', 'full'];
  columnTypes = [
    'String',
    'Text',
    'Integer',
    'Decimal',
    'Date',
    'Time',
    'Datetime',
  ];
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
  aggregateFunctions = ['SUM', 'COUNT', 'MAX', 'MIN'];

  // Temporary state for overlays
  newColumnExpression = '';
  newColumnName = '';
  newColumnType = '';
  selectedTableToAppend = '';
  dropDuplicates = 'No';
  customExpression = '';
  filters: Filter[] = [];
  joins: Join[] = [];
  groups: GroupingData[] = [];

  selectedJoin: Join | null = null;
  joinIndex: number = 0;

  ngOnInit(): void {
    this.getTableNames();
  }

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  tabledata: any[] = [];
  columns: string[] = [];
  selectedColumns: string[] = [];

  sortTable(column: string) {
    // Toggle sort direction when clicking the same column, else set it to 'asc' for a new column.
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc'; // Default to ascending order when a new column is clicked.
    }

    const tableData = this.selectedQuery?.tableData;
    if (!tableData) return;

    // Function to classify and extract text and numbers
    const classifyValue = (value: string) => {
      if (/^\d+$/.test(value)) {
        return { type: 'number', value: parseInt(value, 10) };
      } else if (/^[a-zA-Z_]+\d+$/.test(value)) {
        const match = value.match(/([a-zA-Z_]+)(\d+)/);
        return {
          type: 'stringWithNumber',
          text: match ? match[1] : value,
          number: match && match[2] ? parseInt(match[2], 10) : 0,
        };
      }
      return { type: 'string', value };
    };

    tableData.sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];

      const aParts = classifyValue(aValue);
      const bParts = classifyValue(bValue);

      const direction = this.sortDirection === 'asc' ? 1 : -1;

      // If both are numbers, compare them numerically
      if (aParts.type === 'number' && bParts.type === 'number') {
        return direction * (aParts.value as number) - (bParts.value as number);
      }

      // If one is a number and the other is not, numbers should come first
      if (aParts.type === 'number' && bParts.type !== 'number') {
        return direction * -1; // Numbers come before strings
      }
      if (aParts.type !== 'number' && bParts.type === 'number') {
        return direction * 1; // Strings come after numbers
      }

      // Sorting logic for strings with numbers (e.g., Name_12, Name_11)
      if (
        aParts.type === 'stringWithNumber' &&
        bParts.type === 'stringWithNumber'
      ) {
        if (aParts.text && bParts.text && aParts.text !== bParts.text) {
          return direction * aParts.text.localeCompare(bParts.text); // Compare the text part
        }
        return direction * (aParts.number ?? 0 - (bParts.number ?? 0)); // If text is the same, compare the numeric part
      }

      // Pure strings should be sorted alphabetically
      return (
        direction * String(aParts.value).localeCompare(String(bParts.value))
      );
    });

    // After sorting, update the table data
    this.selectedQuery!.tableData = tableData;
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
      selectedTableToAppend: '',
      selectedColumns: [],
      allColumns: [],
      columnList: [],
      tableData: [],
      joins: [],
      filters: [],
      groups: [],
      dropDuplicates: '',
    };
    this.queries.push(newQuery);
    this.openQuery(newQuery);
  }

  openQuery(query: Query) {
    this.selectedQuery = query;
    this.queryTitle = query.name;
    this.filters = query.filters;
    this.joins = query.joins ?? [];
    this.groups = query.groups;

    if (query.selectedTable) {
      if (query.joins && query.tableData.length === 0) {
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
      this.selectedQuery.selectedColumns = [];
      this.selectedQuery.filters = [];
      this.filters = [];
      this.selectedQuery.joins = [];
    }
    this.closeTableOverlay();
  }

  fetchColumnNames(table: string) {
    debugger;
    this.apiService.GetColumnApi(table).subscribe((res: any) => {
      if (this.selectedQuery) {
        this.selectedQuery.columnList = res;
      }
      if (!this.selectedJoin) {
        this.selectedJoin = {
          sourceColumns: [],
          targetColumns: [],
          sourceColumn: '',
          targetColumn: '',
          joinTable: '',
          joinType: '',
          rightColumns: [],
          re: [],
        };
      }
      const columnList: any = [...res]; // Define columnList as a separate variable
      this.selectedJoin.sourceColumns = [columnList];
      console.log(this.selectedJoin.sourceColumns);
    });
  }

  dataType: Record<string, string> = {};

  fetchDataTypeData(table: string) {
    this.apiService.GetDataTypeData(table).subscribe((res: any) => {
      this.dataType = res;
      console.log(this.dataType);
    });
  }

  fetchDistinctColValues(index: number, columnName: string, tableName: string) {
    this.apiService
      .GetDistinctColValues(tableName, columnName)
      .subscribe((res: any) => {
        this.filters[index].availableValues = res || [];
      });
  }

  fetchFilterData(filterDetails: any) {
    if (this.selectedQuery && this.selectedQuery.selectedTable) {
      const query = this.selectedQuery;
      this.apiService
        .GetExecuteJoinFilter(filterDetails)
        .subscribe((res: any) => {
          if (res.length === 0) {
            query.tableData = [];
          } else {
            query.allColumns = Object.keys(res[0]);
            query.tableData = res;
            // query.selectedColumns = [...query.allColumns];
          }
        });
    }
  }

  fetchTableData() {
    if (this.selectedQuery && this.selectedQuery.selectedTable) {
      const query = this.selectedQuery;
      this.apiService.GetData(query.selectedTable).subscribe((res: any) => {
        query.allColumns = Object.keys(res[0]);
        query.tableData = res;
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

  // RightTable(table: string) {
  //   if (this.selectedQuery && this.selectedQuery.joins[joinIndex]) {
  //     this.selectedQuery.joins[joinIndex].rightTable = table;
  //     this.fetchRightColumnNames(table);
  //   }
  // }

  RightTable(table: string, joinIndex: number) {
    console.log('Current joins array:', this.selectedQuery?.joins);
    console.log('Trying to access index:', joinIndex);

    // Check if selectedQuery exists
    if (!this.selectedQuery) {
      console.error('Error: selectedQuery is null or undefined!');
      return;
    }

    // Initialize joins array if it doesn't exist
    if (!this.selectedQuery.joins) {
      console.log('Initializing joins array...');
      this.selectedQuery.joins = [];
    }

    // Validate joinIndex
    if (joinIndex < 0) {
      console.error('Error: joinIndex cannot be negative:', joinIndex);
      return;
    }

    // Ensure enough join objects exist
    while (this.selectedQuery.joins.length <= joinIndex) {
      console.log(
        `Adding empty join object at index ${this.selectedQuery.joins.length}`
      );
      this.selectedQuery.joins.push({
        joinTable: '',
        sourceColumn: '',
        targetColumn: '',
        joinType: '',
        rightColumns: [],
        sourceColumns: [], // Added missing property
        targetColumns: [], // Added missing property
        re: [],
      });
    }

    console.log(
      'After modification, joins array length:',
      this.selectedQuery.joins.length
    );
    console.log('Target index:', joinIndex);
    console.log('Full joins array:', this.selectedQuery.joins);

    // Verify the join object exists before modifying it
    if (this.selectedQuery.joins[joinIndex] === undefined) {
      console.error(`Error: Join object at index ${joinIndex} is undefined!`);
      return;
    }

    console.log(`Set joinTable to ${table} at index ${joinIndex}`);
    this.selectedJoin = this.selectedQuery.joins[joinIndex];
    this.selectedJoin.joinTable = table;
    this.fetchRightColumnNames(table, joinIndex);
  }

  fetchRightColumnNames(table: string, joinIndex: number) {
    debugger;
    this.apiService.GetColumnApi(table).subscribe((res: any) => {
      if (this.selectedQuery) {
        debugger;
        this.selectedQuery.joins[joinIndex].rightColumns = res;
        this.selectedQuery.joins[joinIndex].re = res;
        console.log('Right column data ', this.selectedJoin?.re);
      }
    });
  }

  confirmJoinTable() {
    if (
      this.selectedQuery &&
      this.selectedJoin !== null &&
      this.joinIndex !== -1
    ) {
      this.fetchJoinData();
      this.selectedQuery.filters = [];
      this.filters = [...this.selectedQuery.filters];
      this.selectedQuery.joins[this.joinIndex] = { ...this.selectedJoin };
    }
    this.showJoinTableOverlay = false;
  }

  fetchJoinData() {
    if (this.selectedQuery && this.selectedQuery.selectedTable) {
      const requestBody = {
        tableName: this.selectedQuery.selectedTable,
        joins: this.selectedQuery.joins,
      };

      this.apiService
        .GetExecuteJoinFilter(requestBody)
        .subscribe((res: any) => {
          if (res.length === 0) {
            // query.tableData = [];
            // query.selectedColumns = [];
            this.selectedQuery!.tableData = [];
            this.selectedQuery!.selectedColumns = [];
          } else {
            // query.allColumns = Object.keys(res[0]);
            // query.tableData = res;
            this.selectedQuery!.allColumns = Object.keys(res[0]);
            this.selectedQuery!.tableData = res;
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
      Table: this.selectedQuery!.selectedTableToAppend,
      DropDuplicates: this.dropDuplicates,
    });
    this.GetAppendData();
    this.closeAppendTableOverlay();
  }

  GetAppendData() {
    const requestBody = {
      table1: this.selectedQuery?.selectedTable,
      table2: this.selectedQuery!.selectedTableToAppend,
      dropDuplicates: this.selectedQuery!.dropDuplicates === 'Yes', // Convert string to boolean
    };

    console.log('TableRequestBody', requestBody);
    debugger;
    const query = this.selectedQuery;

    this.apiService.GetAppendTable(requestBody).subscribe(
      (res: any) => {
        query!.allColumns = Object.keys(res[0]);
        this.selectedQuery!.tableData = res;
        query!.selectedColumns = [...query!.allColumns];
        console.log('API Response:', res);
      },
      (err) => {
        console.error('API Error:', err);
      }
    );
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
    if (this.selectedQuery) {
      this.selectedQuery.filters = [
        ...this.selectedQuery.filters,
        {
          column: '',
          operation: '',
          value: '',
          valueStart: '',
          valueEnd: '',
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
    if (this.selectedQuery) {
      this.selectedQuery.filters.splice(index, 1);
      // ✅ Ensure the UI updates
      this.filters = [...this.selectedQuery.filters];
    }
  }

  updateOperations(index: number) {
    const selectedColumn = this.filters[index].column;
    const columnType = this.dataType[selectedColumn]; // Get data type from dataType object

    if (columnType) {
      this.filters[index].availableOperations =
        this.operations[columnType] || [];
      this.filters[index].operation = '';
      this.filters[index].availableValues = []; // Reset values when column changes

      // Fetch values for the selected column
      if (this.selectedQuery?.selectedTable) {
        this.fetchDistinctColValues(
          index,
          selectedColumn,
          this.selectedQuery.selectedTable
        );
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
    if (this.selectedQuery) {
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
      .filter(
        (filter) =>
          filter.column &&
          filter.operation &&
          (filter.operation !== 'between' ||
            (filter.valueStart && filter.valueEnd))
      ) // Ensure valid filters
      .map((filter, index) => {
        const filterObject: any = {
          columnName: filter.column,
          condition: filter.operation,
          value:
            filter.operation === 'between'
              ? [filter.valueStart, filter.valueEnd] // For 'between' operation, use a range
              : filter.value.toString(), // Convert value to string for consistency
        };

        // Add logicalOperator only if there’s more than one filter
        if (this.filters.length > 1 && index !== this.filters.length - 1) {
          filterObject.logicalOperator = filter.condition; // AND/OR
        }

        return filterObject;
      });

    const requestBody = {
      tableName: this.selectedQuery.selectedTable,
      joins: this.selectedQuery.joins,
      filters: filters,
    };

    console.log('filterConditions:', requestBody);

    this.fetchFilterData(requestBody);
    this.closeFilterRowsOverlay();
  }

  closeFilterRowsOverlay() {
    this.showFilterRowsOverlay = false;
  }

  addGrouping() {
    // this.groups.push({
    //   groupByColumn: '',
    //   aggregateFunction: '',
    //   aggregateColumn: '',
    // });

    if (this.selectedQuery) {
      this.selectedQuery.groups = [
        ...this.selectedQuery.groups,
        {
          groupByColumn: '',
          aggregateFunction: '',
          aggregateColumn: '',
        },
      ];

      // ✅ Ensure Angular detects the change
      this.groups = [...this.selectedQuery.groups];
    }
  }

  removeGrouping(index: number) {
    this.groups.splice(index, 1);
  }

  clearGroupings() {
    this.groups = [];
  }

  applyGroupings() {
    console.log('Groupings DETAILS  :', this.groups);
    debugger;
    this.GetGroupingData();
    this.closeGroupSummarizeOverlay();
  }
  GetGroupingData() {
    const groupingBody: any = {
      tableName: this.selectedQuery?.selectedTable || '',
      aggregations:this.groups?.map((group) => ({
        function: group.aggregateFunction,
        column: group.aggregateColumn,})) || [],
      };

    const groupByColumns =this.groups?.map((group) => group.groupByColumn).filter((col) => col) ||[];
    if (groupByColumns.length > 0) {
      groupingBody.groupByColumns = groupByColumns;
    }

    console.log('Grouping Request Payload:', JSON.stringify(groupingBody, null, 2)); // Debugging
    const query = this.selectedQuery;
    this.apiService.GetGrouping(groupingBody).subscribe(
      (res: any) => {
        const groupedData = res as GroupingData[];
        console.log('Grouped Data:', groupedData);

        query!.allColumns = Object.keys(res[0]);
        query!.tableData = res;
        query!.selectedColumns = [...query!.allColumns];
      },
      (error) => {
        console.error('Error fetching grouped data:', error);
      }
    );
  }

  closeGroupSummarizeOverlay() {
    this.showGroupSummarizeOverlay = false;
  }

  addCharts() {
    this.chartCount++;
    const newChart: Chart = {
      id: this.chartCount,
      name: `Chart ${this.chartCount}`,
    };
    this.charts.push(newChart);
  }

  deleteChart(chartId: number) {
    this.charts = this.charts.filter((q) => q.id !== chartId);
  }

  addDashboard() {
    this.dashboardCount++;
    const newDashboard: Dashboard = {
      id: this.dashboardCount,
      name: `Dashboard ${this.dashboardCount}`,
    };
    this.dashboards.push(newDashboard);
  }

  deleteDashBoard(dashboardId: number) {
    this.dashboards = this.dashboards.filter((q) => q.id !== dashboardId);
  }

  editTable() {
    this.showTableOverlay = true;
  }

  editColumn() {
    this.showColumnOverlay = true;
  }

  editJoin(joinIndex: number) {
    this.selectedJoin = this.selectedQuery?.joins[joinIndex] || null;
    this.showJoinTableOverlay = true;
  }

  editFilter() {
    this.showFilterRowsOverlay = true;
  }
  editgroupby() {
    this.showGroupSummarizeOverlay = true;
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

  openJoinTableOverlay(index: number) {
    if (this.selectedQuery) {
      this.joinIndex = index;
      this.selectedJoin = { ...this.selectedQuery.joins[index] };
      this.showJoinTableOverlay = true;
      this.showOverlay = false;
    }
    // this.showJoinTableOverlay = true;
    // this.showOverlay = false;
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

    if (this.selectedQuery) {
      // Check if columns are selected
      if (this.selectedQuery.selectedColumns.length > 0) {
        const groupColumns = this.groups
          .filter((g) => g.groupByColumn)
          .map((g) => g.groupByColumn);

        let aggregateColumns = this.groups
          .filter((g) => g.aggregateFunction && g.aggregateColumn)
          .map((g) => `${g.aggregateFunction}(${g.aggregateColumn})`);

        // Exclude specific aggregates from being added
        aggregateColumns = aggregateColumns.filter(
          (col) => !['COUNT_DistrictID'].includes(col)
        );

        // Map selected columns
        let selectedColumns = this.selectedQuery.selectedColumns.map((col) => {
          if (
            this.selectedQuery?.columnList?.includes(col) &&
            this.selectedQuery.joins.length > 0
          ) {
            return `${this.selectedQuery?.selectedTable}.${col}`;
          } else if (this.selectedQuery?.columnList?.includes(col)) {
            return `${col}`;
          } else if (
            this.selectedQuery?.joins.some((j) => j.re.includes(col))
          ) {
            const matchingJoin = this.selectedQuery.joins.find((j) =>
              j.re.includes(col)
            );
            return `${matchingJoin?.joinTable}.${col}`;
          }
          return col;
        });

        // Ensure selectedColumns includes groupColumns
        if (groupColumns.length > 0) {
          selectedColumns = [...groupColumns, ...aggregateColumns];
        }

        // Construct the SQL query
        sql += `SELECT ${selectedColumns.join(', ')} FROM ${
          this.selectedQuery.selectedTable
        }\n`;

        // Add GROUP BY only if there are grouping columns
        if (groupColumns.length > 0 && aggregateColumns.length > 0) {
          sql += `GROUP BY ${groupColumns.join(', ')};\n`;
        }
      } else {
        sql += `SELECT * FROM ${this.selectedQuery.selectedTable};\n`;
      }

      // Add JOIN if present
      if (this.selectedQuery.joins.length > 0) {
        this.selectedQuery.joins.forEach((join) => {
          if (
            join.joinTable &&
            join.sourceColumn &&
            join.targetColumn &&
            join.joinType.length >= 1
          ) {
            const joinType = join.joinType.toUpperCase();
            sql += `${joinType} JOIN ${join.joinTable} ON ${this.selectedQuery?.selectedTable}.${join.sourceColumn} = ${join.joinTable}.${join.targetColumn}\n`;
          }
        });
      }
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
              debugger;
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} = '${filter.value}'`;
              } else {
                clause = `${filter.column} = '${filter.value}'`;
              }

              break;
            case 'is not':
            case 'not equals':
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} != '${filter.value}'`;
              }
              clause = `${filter.column} != '${filter.value}'`;
              break;
            case 'greater than':
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} > ${filter.value}`;
              }
              clause = `${filter.column} > ${filter.value}`;
              break;
            case 'greater than or equals':
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} >= ${filter.value}`;
              }
              clause = `${filter.column} >= ${filter.value}`;
              break;
            case 'less than':
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} < ${filter.value}`;
              }
              clause = `${filter.column} < ${filter.value}`;
              break;
            case 'less than or equals':
              if (this.selectedQuery && this.selectedQuery.joins.length > 0) {
                clause = `${this.selectedQuery?.selectedTable}.${filter.column} <= ${filter.value}`;
              }
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
    // Add GROUP BY and aggregation if present
    // if (
    //   this.groups.some((g) => g.groupByColumn) &&
    //   this.groups.some((g) => g.aggregateColumn)
    // ) {
    //   const groupColumns = this.groups
    //     .filter((g) => g.groupByColumn)
    //     .map((g) => g.groupByColumn);
    //   const aggregateColumns = this.groups
    //     .filter((g) => g.aggregateColumn)
    //     .map((g) => g.aggregateColumn);
    //   // sql += `${groupColumns.join(", ")}, ${aggregateColumns.join(", ")}\n`;
    //   if (aggregateColumns.length > 0) {
    //     debugger;
    //     sql += `GROUP BY ${groupColumns.join(', ')};\n `;
    //   }
    // }
    // if (this.groups.some((g) => g.groupByColumn))
    // {
    //   const groupColumns = this.groups
    //     .filter((g) => g.groupByColumn)
    //     .map((g) => g.groupByColumn);
    //     console.log(groupColumns)

    //   if (groupColumns.length > 0) {
    //     debugger;
    //     sql += `GROUP BY ${groupColumns.join(', ')}\n`;
    //   }
    // }

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

  openSaveSqlOverlay() {
    debugger;
    this.loadSqlHistory();
    this.showSaveSqlOverlay = true;
  }

  // Close the save SQL overlay
  closeSaveSqlOverlay() {
    this.showSaveSqlOverlay = false;
    this.queryName = '';
    this.queryTitleForSave = '';
  }

  // Save SQL query to the backend
  saveSqlQuery() {
    if (!this.queryName) {
      alert('Please enter a query name.');
      return;
    }

    const filterBody = {
      sqlQuery: this.sqlTemplate,
      save: true,
      queryName: this.queryName,
      queryTitle: this.queryTitleForSave || this.queryName, // Use queryName if queryTitle is not provided
      userId: this.userId,
    };

    this.apiService.GetSqlQuery(filterBody).subscribe((response) => {
      console.log('SQL query saved successfully:', response);
      alert('SQL query saved successfully!');
      this.closeSaveSqlOverlay();
    });
  }

  // sqlHistoryData: any[] = [];

  // Show SQL history overlay and fetch history
  showSqlHistory() {
    this.showSqlHistoryOverlay = true;
    this.loadSqlHistorydata();
  }

  // Close SQL history overlay
  closeSqlHistoryOverlay() {
    this.showSqlHistoryOverlay = false;
  }

  // Fetch SQL history from the backend
  loadSqlHistory() {
    const filterBody = {
      sqlQuery: '',
      save: false,
      queryName: '',
      queryTitle: '',
      userId: this.userId,
    };

    this.apiService.GetSqlQuery(filterBody).subscribe(
      (response: any) => {
        this.sqlHistory = response || [];
      }
      // (error) => {
      //   console.error('Error loading SQL history:', error);
      //   alert('Failed to load SQL history.');
      // }
    );
  }

  loadSqlHistorydata() {
    this.apiService.GetsqlData({ userId: 0 }).subscribe((res: any) => {
      console.log('SQL History Data:', res);
      if (Array.isArray(res)) {
        this.sqlHistoryData = res;
        console.log(this.sqlHistoryData);
      } else {
        console.error('Unexpected API response format:', res);
      }
    });
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
