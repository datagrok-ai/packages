package grok_connect.resultset;

import grok_connect.managers.ColumnManager;
import org.slf4j.Logger;
import serialization.Column;
import java.sql.ResultSetMetaData;

public interface ResultSetManager {

    /**
     * Used to init all necessary managers, columns and columnsMetas in arrays for
     * fast access to them lately in processValue method.
     *
     * @param meta ResultSetMetaData (JDBC interface)
     */
    void init(ResultSetMetaData meta, int initColumnSize);

    ColumnManager<?> getApplicableColumnManager(ColumnMeta meta);

    /**
     * Used to process Object from ResultSet based on previously generated ColumnsMeta, Column and ColumnManager.
     *
     * @param o Object from ResultSet
     * @param index Column index
     * @param queryLogger Logger
     */
    void processValue(Object o, int index);

    /**
     * Return filled Columns
     *
     * @return Column array
     */
    Column[] getProcessedColumns();

    /**
     * Empty all columns for reuse without the need to init ResultSetManager again
     */
    void empty(int newColSize);
}
