package serialization;


import java.util.Arrays;
import java.util.Objects;

// Float column.
public class FloatColumn extends Column<Float> {
    private static final String TYPE = Types.FLOAT;
    static final double None = 2.6789344063684636e-34;

    private float[] data;

    public String getType() {
        return TYPE;
    }

    public void empty() {
        length = 0;
        data = new float[100];
    }

    public FloatColumn() {
        data = new float[100];
    }

    public FloatColumn(Float[] values) {
        data = new float[100];
        addAll(values);
    }

    public void encode(BufferAccessor buf) {
        buf.writeInt32(1);  // Encoder ID
        buf.writeInt8((byte)0);   // Archive
        buf.writeFloat32List(data, 0, length);
    }

    public void add(Float value) {
        ensureSpace(1);
        data[length++] = (value != null) ? value : (float)None;
    }

    public void addAll(Float[] values) {
        ensureSpace(values.length);
        for (int n = 0; n < values.length; n++)
            data[length++] = (values[n] != null) ? values[n] : (float)None;
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
            float[] newData = new float[data.length * 2 + Math.max(0, length + extraLength - data.length * 2)];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
    }

    public float[] getData() {
        return data;
    }

    @Override
    public String toString() {
        return "FloatColumn{" +
                "data=" + Arrays.toString(data) +
                ", name='" + name + '\'' +
                ", tags=" + tags +
                '}';
    }
}
