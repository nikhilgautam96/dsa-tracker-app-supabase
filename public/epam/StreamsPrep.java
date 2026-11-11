import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class StreamsPrep {
    static class Employee {
        private final String name, dept; private final double salary;
        Employee(String name, String dept, double salary) { this.name = name; this.dept = dept; this.salary = salary; }
        String getName() { return name; }  String getDept() { return dept; }  double getSalary() { return salary; }
    }

    static final List<Employee> EMPLOYEES = Arrays.asList(
        new Employee("Asha",  "Engineering", 120000),
        new Employee("Ravi",  "Engineering",  95000),
        new Employee("Meera", "HR",           60000),
        new Employee("Karan", "Sales",        70000),
        new Employee("Divya", "Engineering", 135000),
        new Employee("Arjun", "HR",           65000),
        new Employee("Neha",  "Sales",        82000));

    public static void main(String[] args) {
        // 1
        List<Integer> nums = Arrays.asList(5, 9, 2, 9, 7, 5);
        Optional<Integer> second = nums.stream().distinct()
            .sorted(Comparator.reverseOrder()).skip(1).findFirst();
        System.out.println("1  " + second.orElse(null));

        // 2
        List<Integer> withDups = Arrays.asList(1, 4, 2, 4, 3, 1, 4);
        Set<Integer> seen = new HashSet<>();
        List<Integer> dups = withDups.stream().filter(n -> !seen.add(n)).distinct().collect(Collectors.toList());
        Set<Integer> dups2 = withDups.stream()
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))
            .entrySet().stream().filter(e -> e.getValue() > 1).map(Map.Entry::getKey)
            .collect(Collectors.toCollection(LinkedHashSet::new));
        System.out.println("2  " + dups + " " + dups2);

        // 3
        String s = "programming";
        Map<Character, Long> freq = s.chars().mapToObj(c -> (char) c)
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        System.out.println("3  " + freq);

        // 4
        Map<String, List<String>> byDept = EMPLOYEES.stream()
            .collect(Collectors.groupingBy(Employee::getDept, TreeMap::new,
                     Collectors.mapping(Employee::getName, Collectors.toList())));
        System.out.println("4  " + byDept);

        // 5
        Map<String, Employee> topPerDept = EMPLOYEES.stream()
            .collect(Collectors.toMap(Employee::getDept, Function.identity(),
                     BinaryOperator.maxBy(Comparator.comparingDouble(Employee::getSalary)), TreeMap::new));
        topPerDept.forEach((d, e) -> System.out.println("5  " + d + " -> " + e.getName()));
        Map<String, Optional<Employee>> topPerDept2 = EMPLOYEES.stream()
            .collect(Collectors.groupingBy(Employee::getDept, TreeMap::new,
                     Collectors.maxBy(Comparator.comparingDouble(Employee::getSalary))));
        System.out.println("5b " + topPerDept2.get("Sales").map(Employee::getName).orElse("-"));

        // 6
        List<String> bySalaryDesc = EMPLOYEES.stream()
            .sorted(Comparator.comparingDouble(Employee::getSalary).reversed()
                              .thenComparing(Employee::getName))
            .map(Employee::getName).collect(Collectors.toList());
        System.out.println("6  " + bySalaryDesc);

        // 7
        String word = "swiss";
        Optional<Character> firstUnique = word.chars().mapToObj(c -> (char) c)
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))
            .entrySet().stream().filter(e -> e.getValue() == 1).map(Map.Entry::getKey).findFirst();
        System.out.println("7  " + firstUnique.orElse(null));

        // 8
        List<List<Integer>> nested = Arrays.asList(Arrays.asList(1, 2), Arrays.asList(3), Collections.emptyList(), Arrays.asList(4, 5));
        List<Integer> flat = nested.stream().flatMap(List::stream).collect(Collectors.toList());
        System.out.println("8  " + flat);

        // 9
        Map<Boolean, List<Integer>> evenOdd = IntStream.rangeClosed(1, 10).boxed()
            .collect(Collectors.partitioningBy(n -> n % 2 == 0));
        System.out.println("9  even=" + evenOdd.get(true) + " odd=" + evenOdd.get(false));

        // 10
        List<String> top3 = EMPLOYEES.stream()
            .sorted(Comparator.comparingDouble(Employee::getSalary).reversed())
            .limit(3).map(Employee::getName).collect(Collectors.toList());
        System.out.println("10 " + top3);

        // 11
        List<String> sentences = Arrays.asList("the cat sat", "The dog sat down", "the cat and the dog");
        Optional<Map.Entry<String, Long>> mostFrequent = sentences.stream()
            .flatMap(line -> Arrays.stream(line.toLowerCase().split("\\W+")))
            .filter(w -> !w.isEmpty())
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
            .entrySet().stream()
            .max(Map.Entry.<String, Long>comparingByValue()
                 .thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())));
        System.out.println("11 " + mostFrequent.map(e -> e.getKey() + "=" + e.getValue()).orElse("-"));

        // 12
        Map<String, Double> salaryByDept = EMPLOYEES.stream()
            .collect(Collectors.groupingBy(Employee::getDept, TreeMap::new,
                     Collectors.summingDouble(Employee::getSalary)));
        System.out.println("12 " + salaryByDept);

        // bonus: edge cases
        System.out.println("E1 " + Arrays.asList(7, 7).stream().distinct()
            .sorted(Comparator.reverseOrder()).skip(1).findFirst());
    }
}
