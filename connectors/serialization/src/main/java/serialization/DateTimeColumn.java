package serialization;

import java.time.*;
import java.util.Arrays;
import java.util.Objects;


// Data time column.
public class DateTimeColumn extends Column<Double> {
    private static final String TYPE = Types.DATE_TIME;

    private double[] data;

    public String getType() {
        return TYPE;
    }

    public void empty() {
        length = 0;
        data = new double[100];
    }

    public DateTimeColumn() {
        data = new double[100];
    }

    public DateTimeColumn(Double[] values) {
        data = new double[100];
        addAll(values);
    }

    public void encode(BufferAccessor buf) {
        buf.writeInt32(3); // Encoder ID
        buf.writeFloat64List(data, 0, length);
    }

    private void rawEncoder(BufferAccessor buf) {
        // Convert to separate vectors
        short[] year = new short[length];
        byte[] month = new byte[length];
        byte[] day = new byte[length];
        byte[] hour = null;
        byte[] minute = null;
        byte[] second = null;
        short[] millisecond = null;

        for (int n = 0; n < length; n++) {
            if (data[n] != FloatColumn.None) {
                LocalDateTime dateTime = Instant.ofEpochMilli((long)data[n] / 1000).atZone(ZoneId.of("UTC+0")).toLocalDateTime();
                year[n] = (short) dateTime.getYear();
                month[n] = (byte) dateTime.getMonthValue();
                day[n] = (byte) dateTime.getDayOfMonth();
                hour = setDataValueByteArray(hour, n, (byte) dateTime.getHour());
                minute = setDataValueByteArray(minute, n, (byte) dateTime.getMinute());
                second = setDataValueByteArray(second, n, (byte) dateTime.getSecond());
                millisecond = setDataValueShortArray(millisecond, n, (short) (dateTime.getNano() / 1000000));
            } else {
                year[n] = 1;
                month[n] = 1;
                day[n] = 1;
            }
        }

        buf.writeInt32(1); // Encoder ID
        writeShortArray(buf, year);
        writeByteArray(buf, month);
        writeByteArray(buf, day);
        writeByteArray(buf, hour);
        writeByteArray(buf, minute);
        writeByteArray(buf, second);
        writeShortArray(buf, millisecond);
        writeShortArray(buf, null);
    }

    public void add(Double value) {
        ensureSpace(1);
        setValue(length++, (value != null) ? value : FloatColumn.None);
    }

    public void addAll(Double[] values) {
        ensureSpace(values.length);
        for (int n = 0; n < values.length; n++)
            setValue(length++, (values[n] != null) ? values[n] : FloatColumn.None);
    }

    public Object get(int idx) {
        return data[idx];
    }

    @Override
    public long memoryInBytes() {
        return data.length * 8;
    }

    public boolean isNone(int idx) {
        return data[idx] == FloatColumn.None;
    }

    private void ensureSpace(int extraLength) {
        if (length + extraLength > data.length) {
            double[] newData = new double[data.length * 2 + Math.max(0, length + extraLength - data.length * 2)];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
    }

    private void setValue(int idx, Double value) {
        data[idx] = value;
    }

    private short[] setDataValueShortArray(short[] array, int idx, short value) {
        if (value != 0) {
            if (array == null)
                array = new short[length];
            array[idx] = value;
        }
        return array;
    }

    private byte[] setDataValueByteArray(byte[] array, int idx, byte value) {
        if (value != 0) {
            if (array == null)
                array = new byte[length];
            array[idx] = value;
        }
        return array;
    }

    private static void writeShortArray(BufferAccessor buf, short[] array) {
        buf.writeInt8((byte)((array != null) ? 1 : 0));
        buf.writeInt8((byte)0); // Archive
        if (array != null)
            buf.writeInt16List(array);
    }

    private static void writeByteArray(BufferAccessor buf, byte[] array) {
        buf.writeInt8((byte)((array != null) ? 1 : 0));
        buf.writeInt8((byte)0); // Archive
        if (array != null)
            buf.writeInt8List(array);
    }

    public double[] getData() {
        return data;
    }
}
