const fixes=[['傅說','傅悅'],['膠鬲','膠格'],['拂士','弼士'],['行拂','行弗'],['畎畝','犬畝'],['曾益','增益']];
export const speak=text=>fixes.reduce((s,[from,to])=>s.replaceAll(from,to),text);
