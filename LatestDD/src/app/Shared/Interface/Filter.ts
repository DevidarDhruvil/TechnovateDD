export interface Filter{
    column: string;
  operation: string;
  value: string | number;
  valueStart: string;
  valueEnd: string;
  availableOperations: string[];
  availableValues: (string | number)[];
  condition: 'AND' | 'OR';
}

export interface FilterColumn{
    name: string;
  type: 'string' | 'DateTime' | 'integer' | 'decimal';
  values: string[] | number[];
}