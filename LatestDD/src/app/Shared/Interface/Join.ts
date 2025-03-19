export interface Join{
    rightTable: string;
    rightColumns: string[];
    selectedJoinTable: string;
    selectedJoinType: string;
    selectedLeftColumn: string;
    selectedRightColumn: string;
    // leftTable: string;
    sourceColumn: string;
    joinTable: string;
    targetColumn: string;
    joinType: string;
}