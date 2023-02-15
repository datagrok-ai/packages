package serialization;


import java.util.Arrays;
import java.util.Objects;

// Integer column.
public class IntColumn extends Column<Integer> {
    private static final String TYPE = Types.INT;
    private static final int None = -2147483648;

    private int[] data;

    public String getType() {
        return TYPE;
    }

    public IntColumn() {
        data = new int[100];
    }

    public IntColumn(Integer[] values) {
        data = new int[100];
        addAll(values);
    }

    public void encode(BufferAccessor buf) {
        buf.writeInt32(1);
        buf.writeInt8((byte)0);
        buf.writeInt32List(data, 0, length);
    }

    public void add(Integer value) {
        ensureSpace(1);
        data[length++] = (value != null) ? value : None;
    }

    public void addAll(Integer[] values) {
        ensureSpace(values.length);
        for (int n = 0; n < values.length; n++)
            data[length++] = (values[n] != null) ? values[n] : None;
    }

    public Object get(int idx) {
        return data[idx];
    }

    @Override
    public long memoryInBytes() {
        return data.length * 4;
    }

    public boolean isNone(int idx) {
        return data[idx] == None;
    }

    private void ensureSpace(int extraLength) {
        if (length + extraLength > data.length) {
            int[] newData = new int[data.length * 2 + Math.max(0, length + extraLength - data.length * 2)];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IntColumn that = (IntColumn) o;
        return Arrays.equals(data, that.data)
                && Objects.equals(name, that.name)
                && Objects.equals(getType(), that.getType());
    }

    @Override
    public int hashCode() {
        int dataHash = Arrays.hashCode(data);
        dataHash += name == null ? 1 : name.hashCode();
        dataHash += getType() == null ? 1 : getType().hashCode();
        return dataHash;
    }
}
