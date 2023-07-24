package serialization;

// Bool column.
public class BoolColumn extends Column<Boolean> {
    private static final String TYPE = Types.BOOL;

    private int[] data;

    public BoolColumn() {
        data = new int[initColumnSize];
    }

    public BoolColumn(Boolean[] values) {
        data = new int[initColumnSize];
        addAll(values);
    }

    public BoolColumn(int initColumnSize) {
        this.initColumnSize = initColumnSize;
        data = new int[initColumnSize];
    }

    public String getType() {
        return TYPE;
    }

    public void empty() {
        length = 0;
        data = new int[initColumnSize];
    }

    public void encode(BufferAccessor buf) {
        buf.writeInt32(1);
        buf.writeInt64(length);
        buf.writeInt8((byte)0);
        buf.writeUint32List(data, 0, ((length + 0x1F) / 0x20));
    }

    public void add(Boolean value) {
        ensureSpace(1);
        if ((value != null) && value)
            data[length / 0x20] |= 1 << ((length % 0x20) & 0x1F);
        length++;
    }

    public void addAll(Boolean[] values) {
        ensureSpace(values.length);
        for (int n = 0; n < values.length; n++) {
            if ((values[n] != null) && values[n])
                data[length / 0x20] |= 1 << ((length % 0x20) & 0x1F);
            length++;
        }
    }

    public Object get(int idx) {
        return data[idx];
    }

    /**
     * don't use this method, should be used from complexTypeColumn
     */
    @Override
    public void set(int index, Boolean value) {
        if (index != length - 1) {
            throw new IllegalArgumentException("Can set only penultimate element");
        }
        length--;
        add(value);
    }

    public boolean isNone(int idx) {
        return false;
    }

    @Override
    public long memoryInBytes() {
        return data.length * 4;
    }

    private void ensureSpace(int extraLength) {
        int lengthInInts = ((length + extraLength + 0x1F) / 0x20);
        if (lengthInInts > data.length) {
            int[] newData = new int[data.length * 2 + Math.max(0, lengthInInts - data.length * 2)];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
    }

    public int[] getData() {
        return data;
    }
}
