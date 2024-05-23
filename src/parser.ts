// @ts-nocheck

import { parse, createVisitor } from 'java-ast';

type MethodInfo = {
    methodName: string,
    methodDeclaration: string,
    methodContent: string,
    className: string
};

function getMethodsWithContent(javaCode: string): Array<MethodInfo> {
    const ast = parse(javaCode);

    let methods = new Array<MethodInfo>;
    let className = "";

    createVisitor({
        visitClassDeclaration: (context) => {
            className = context.getChild(1).text;
            return 1;
        },
        defaultResult: () => 0,
        aggregateResult: (a, b) => a + b,
    }).visit(ast);

    let methodsNumber = createVisitor({
        visitMethodDeclaration: (context) => {
            let start = context.getChild(2);
            let method: MethodInfo = {
                methodName: context.getChild(1).text,
                methodDeclaration: `${context.getChild(0).text} ${context.getChild(1).text} ${javaCode.substring(start._start.startIndex, start._stop.stopIndex + 1)}`,
                methodContent: context.getChild(3).text,
                className: className
            };
            methods.push(method);
            return 1;
        },
        defaultResult: () => 0,
        aggregateResult: (a, b) => a + b,
    }).visit(ast);

    console.log(methodsNumber);
    console.log(methods);

    return methods;
}


export { getMethodsWithContent, MethodInfo };