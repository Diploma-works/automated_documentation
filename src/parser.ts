import { parse, createVisitor } from 'java-ast';

function getMethodsWithContent(javaCode: string): Map<string, string> {
    const ast = parse(javaCode);

    let methods = new Map<string, string>();

    let methodsNumber = createVisitor({
        visitMethodDeclaration: (context) => {
            let end = context._stop?.stopIndex != undefined ? context._stop?.stopIndex : 0;
            methods.set(context.getChild(1).text, javaCode.substring(context._start.startIndex, end + 1))
            return 1
        },
        defaultResult: () => 0,
        aggregateResult: (a, b) => a + b,
    }).visit(ast);

    console.log(methodsNumber)
    console.log(methods)

    return methods;
}


export { getMethodsWithContent }