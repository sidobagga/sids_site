declare module "@mapbox/polyline" {
  const polyline: {
    decode(value: string, precision?: number): Array<[number, number]>;
    encode(points: Array<[number, number]>, precision?: number): string;
  };

  export default polyline;
}
